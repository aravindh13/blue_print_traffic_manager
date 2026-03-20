const Ambulance = require('../models/Ambulance');
const Incident = require('../models/Incident');
const { haversine } = require('./haversine');

const LOCK_TIMEOUT_MS = 30000;
const CONFLICT_DISTANCE_M = 50;
const RESOURCE_GRID_SIZE = 0.001;

class ResourceLockManager {
  constructor() {
    this.locks = new Map();
    this.waitQueues = new Map();
    this.conflicts = new Map();
    this.deadlockWarnings = [];
  }

  getResourceKey(lat, lng) {
    const gridLat = Math.floor(lat / RESOURCE_GRID_SIZE) * RESOURCE_GRID_SIZE;
    const gridLng = Math.floor(lng / RESOURCE_GRID_SIZE) * RESOURCE_GRID_SIZE;
    return `${gridLat.toFixed(4)},${gridLng.toFixed(4)}`;
  }

  async acquireLock(ambulanceId, lat, lng, priority = 5) {
    const resourceKey = this.getResourceKey(lat, lng);
    
    if (!this.locks.has(resourceKey)) {
      this.locks.set(resourceKey, {
        ambulanceId: ambulanceId.toString(),
        priority,
        acquiredAt: Date.now(),
        expiresAt: Date.now() + LOCK_TIMEOUT_MS,
        lat,
        lng
      });
      return { acquired: true, resourceKey, position: { lat, lng } };
    }

    const existingLock = this.locks.get(resourceKey);
    
    if (existingLock.ambulanceId === ambulanceId.toString()) {
      existingLock.expiresAt = Date.now() + LOCK_TIMEOUT_MS;
      return { acquired: true, resourceKey, refreshed: true, position: { lat, lng } };
    }

    if (priority > existingLock.priority) {
      this.addToWaitQueue(existingLock.ambulanceId, resourceKey, existingLock.priority);
      existingLock.ambulanceId = ambulanceId.toString();
      existingLock.priority = priority;
      existingLock.acquiredAt = Date.now();
      existingLock.expiresAt = Date.now() + LOCK_TIMEOUT_MS;
      return { acquired: true, resourceKey, preempted: true, position: { lat, lng } };
    }

    this.addToWaitQueue(ambulanceId, resourceKey, priority);
    return { acquired: false, resourceKey, position: { lat, lng }, waitPosition: this.getWaitPosition(resourceKey, ambulanceId) };
  }

  addToWaitQueue(ambulanceId, resourceKey, priority) {
    if (!this.waitQueues.has(resourceKey)) {
      this.waitQueues.set(resourceKey, []);
    }
    const queue = this.waitQueues.get(resourceKey);
    const existingIndex = queue.findIndex(w => w.ambulanceId === ambulanceId.toString());
    if (existingIndex === -1) {
      queue.push({ ambulanceId: ambulanceId.toString(), priority, addedAt: Date.now() });
      queue.sort((a, b) => b.priority - a.priority || a.addedAt - b.addedAt);
    }
  }

  getWaitPosition(resourceKey, ambulanceId) {
    const queue = this.waitQueues.get(resourceKey) || [];
    const index = queue.findIndex(w => w.ambulanceId === ambulanceId.toString());
    return index + 1;
  }

  releaseLock(ambulanceId, lat, lng) {
    const resourceKey = this.getResourceKey(lat, lng);
    const lock = this.locks.get(resourceKey);
    
    if (lock && lock.ambulanceId === ambulanceId.toString()) {
      this.locks.delete(resourceKey);
      
      const queue = this.waitQueues.get(resourceKey);
      if (queue && queue.length > 0) {
        const next = queue.shift();
        this.locks.set(resourceKey, {
          ambulanceId: next.ambulanceId,
          priority: next.priority,
          acquiredAt: Date.now(),
          expiresAt: Date.now() + LOCK_TIMEOUT_MS,
          lat: lock.lat,
          lng: lock.lng
        });
        return { released: true, nextInQueue: next };
      }
      return { released: true };
    }
    return { released: false };
  }

  checkForConflicts(ambulanceId, lat, lng) {
    const nearbyConflicts = [];
    
    for (const [resourceKey, lock] of this.locks.entries()) {
      if (lock.ambulanceId === ambulanceId.toString()) continue;
      
      const dist = haversine(lat, lng, lock.lat, lock.lng) * 1000;
      if (dist < CONFLICT_DISTANCE_M) {
        nearbyConflicts.push({
          resourceKey,
          conflictingAmbulanceId: lock.ambulanceId,
          distance: dist,
          position: { lat: lock.lat, lng: lock.lng }
        });
      }
    }
    
    return nearbyConflicts;
  }

  cleanupExpiredLocks() {
    const now = Date.now();
    const expired = [];
    
    for (const [resourceKey, lock] of this.locks.entries()) {
      if (lock.expiresAt < now) {
        expired.push({ resourceKey, lock });
        this.locks.delete(resourceKey);
        
        const queue = this.waitQueues.get(resourceKey);
        if (queue && queue.length > 0) {
          const next = queue.shift();
          this.locks.set(resourceKey, {
            ambulanceId: next.ambulanceId,
            priority: next.priority,
            acquiredAt: Date.now(),
            expiresAt: now + LOCK_TIMEOUT_MS,
            lat: lock.lat,
            lng: lock.lng
          });
        }
      }
    }
    
    return expired;
  }

  detectCircularWait() {
    const waitGraph = new Map();
    
    for (const [resourceKey, lock] of this.locks.entries()) {
      const ambId = lock.ambulanceId;
      if (!waitGraph.has(ambId)) {
        waitGraph.set(ambId, new Set());
      }
    }
    
    for (const [resourceKey, lock] of this.locks.entries()) {
      const queue = this.waitQueues.get(resourceKey) || [];
      for (const waiting of queue) {
        if (waitGraph.has(waiting.ambulanceId)) {
          waitGraph.get(waiting.ambulanceId).add(lock.ambulanceId);
        }
      }
    }
    
    const visited = new Set();
    const recursionStack = new Set();
    
    const hasCycle = (node, path = []) => {
      if (recursionStack.has(node)) {
        return path.slice(path.indexOf(node));
      }
      if (visited.has(node)) return null;
      
      visited.add(node);
      recursionStack.add(node);
      
      const neighbors = waitGraph.get(node) || new Set();
      for (const neighbor of neighbors) {
        const cycle = hasCycle(neighbor, [...path, node]);
        if (cycle) return cycle;
      }
      
      recursionStack.delete(node);
      return null;
    };
    
    for (const node of waitGraph.keys()) {
      const cycle = hasCycle(node);
      if (cycle) {
        return { hasDeadlock: true, cycle };
      }
    }
    
    return { hasDeadlock: false };
  }

  resolveDeadlock(cycle) {
    if (!cycle || cycle.length < 2) return null;
    
    let lowestPriority = Infinity;
    let victimAmbulance = null;
    
    for (const ambId of cycle) {
      const queue = [];
      for (const [resourceKey, q] of this.waitQueues.entries()) {
        const waiting = q.find(w => w.ambulanceId === ambId);
        if (waiting) {
          queue.push({ resourceKey, ...waiting });
        }
      }
      
      for (const item of queue) {
        if (item.priority < lowestPriority) {
          lowestPriority = item.priority;
          victimAmbulance = { ambulanceId: ambId, resourceKey: item.resourceKey };
        }
      }
    }
    
    if (victimAmbulance) {
      const queue = this.waitQueues.get(victimAmbulance.resourceKey);
      if (queue) {
        const index = queue.findIndex(w => w.ambulanceId === victimAmbulance.ambulanceId);
        if (index !== -1) {
          queue.splice(index, 1);
        }
      }
      
      this.deadlockWarnings.push({
        type: 'deadlock_resolved',
        victim: victimAmbulance,
        timestamp: Date.now()
      });
      
      return victimAmbulance;
    }
    
    return null;
  }

  getStatus() {
    const locksArray = [];
    for (const [resourceKey, lock] of this.locks.entries()) {
      locksArray.push({
        resourceKey,
        ambulanceId: lock.ambulanceId,
        priority: lock.priority,
        acquiredAt: lock.acquiredAt,
        expiresIn: Math.max(0, lock.expiresAt - Date.now()),
        lat: lock.lat,
        lng: lock.lng
      });
    }

    const queuesArray = [];
    for (const [resourceKey, queue] of this.waitQueues.entries()) {
      if (queue.length > 0) {
        queuesArray.push({ resourceKey, queue });
      }
    }

    return {
      activeLocks: locksArray,
      waitQueues: queuesArray,
      totalLocks: this.locks.size,
      totalWaiting: queuesArray.reduce((sum, q) => sum + q.queue.length, 0),
      recentWarnings: this.deadlockWarnings.slice(-10)
    };
  }

  async runDeadlockPreventionCycle(io) {
    this.cleanupExpiredLocks();
    
    const deadlock = this.detectCircularWait();
    if (deadlock.hasDeadlock) {
      const victim = this.resolveDeadlock(deadlock.cycle);
      if (victim && io) {
        io.emit('deadlock:resolved', {
          victimAmbulanceId: victim.ambulanceId,
          resourceKey: victim.resourceKey,
          cycle: deadlock.cycle
        });
      }
    }
    
    return { deadlock, resolved: deadlock.hasDeadlock };
  }
}

const lockManager = new ResourceLockManager();

setInterval(() => {
  lockManager.cleanupExpiredLocks();
}, 10000);

async function preventDeadlocks(io) {
  try {
    const result = await lockManager.runDeadlockPreventionCycle(io);
    return result;
  } catch (error) {
    console.error('Deadlock prevention error:', error);
    return { error: error.message };
  }
}

async function lockResourceForAmbulance(ambulanceId, lat, lng, priority = 5, io = null) {
  const result = lockManager.acquireLock(ambulanceId, lat, lng, priority);
  
  if (result.acquired && io) {
    io.emit('resource:locked', {
      ambulanceId,
      resourceKey: result.resourceKey,
      lat,
      lng,
      preempted: result.preempted || false
    });
  }
  
  if (!result.acquired && io) {
    io.emit('resource:waiting', {
      ambulanceId,
      resourceKey: result.resourceKey,
      position: result.waitPosition,
      lat,
      lng
    });
  }
  
  return result;
}

function releaseResourceForAmbulance(ambulanceId, lat, lng, io = null) {
  const result = lockManager.releaseLock(ambulanceId, lat, lng);
  
  if (result.released && io) {
    io.emit('resource:released', {
      ambulanceId,
      lat,
      lng,
      nextInQueue: result.nextInQueue
    });
  }
  
  return result;
}

function checkConflictsForAmbulance(ambulanceId, lat, lng) {
  return lockManager.checkForConflicts(ambulanceId, lat, lng);
}

function getDeadlockStatus() {
  return lockManager.getStatus();
}

module.exports = {
  lockManager,
  preventDeadlocks,
  lockResourceForAmbulance,
  releaseResourceForAmbulance,
  checkConflictsForAmbulance,
  getDeadlockStatus
};
