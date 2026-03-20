"""
env/traffic_env.py

A Gymnasium-compatible SUMO traffic environment for the Gridlock-Breaker
comparative study. Wraps SUMO via TraCI to expose:

  Observation: per-traffic-light queue length, lane density, avg speed (flattened)
  Action:      per-traffic-light phase index (Discrete)
  Reward:      -sum(waiting_time) + throughput_bonus + emergency_bonus
"""

import os
import sys
import math
import numpy as np
import gymnasium as gym
from gymnasium import spaces

import config

# Lazy import traci to avoid import errors when SUMO is not running
try:
    import traci
    import traci.exceptions
except ImportError:
    traci = None


# ─────────────────────────────────────────────────────────────
# Utilities
# ─────────────────────────────────────────────────────────────

def _calculate_distance(pos1, pos2):
    return math.sqrt((pos1[0] - pos2[0]) ** 2 + (pos1[1] - pos2[1]) ** 2)


# ─────────────────────────────────────────────────────────────
# Environment
# ─────────────────────────────────────────────────────────────

class TrafficEnv(gym.Env):
    """
    Single-step Gymnasium environment for SUMO 4x4 grid.

    One environment step = one SUMO simulation step (1 second).
    The RL agent selects one action per traffic light per step.
    """

    metadata = {"render_modes": ["human"]}

    # How many SUMO phases we assume per intersection (netgenerate default: 4)
    MAX_PHASES = 4
    # Number of observed metrics per controlled lane
    LANE_OBS_DIM = 3   # [queue_length (norm), density (norm), avg_speed (norm)]

    def __init__(self, sumo_cfg: str = None, gui: bool = False, seed: int = 42):
        super().__init__()
        self.sumo_cfg = sumo_cfg or config.AI_CFG
        self.gui       = gui
        self._seed     = seed
        self._step_num = 0
        self._done     = False

        # These are resolved after SUMO starts
        self.tl_ids: list = []
        self.tl_lanes: dict = {}        # {tl_id: [lane_id, ...]}
        self.tl_positions: dict = {}    # {tl_id: (x, y)}

        self._prev_waiting = 0.0
        self._vehicles_arrived = 0

        # Discover real network dims by starting SUMO once headlessly
        self._discover_network_dims()

        self.observation_space = spaces.Box(
            low=0.0, high=1.0,
            shape=(self._obs_dim,),
            dtype=np.float32,
        )
        self.action_space = spaces.MultiDiscrete(
            [self.MAX_PHASES] * self._n_tls
        )

    # ─────────────────────────────────
    # Network discovery (called once in __init__)
    # ─────────────────────────────────

    def _discover_network_dims(self):
        """Start SUMO briefly to find real TL/lane counts, then close."""
        try:
            traci.close()
        except Exception:
            pass
        sumo_cmd = [
            os.path.join(config.SUMO_BIN, "sumo.exe"),
            "-c", self.sumo_cfg,
            "--start", "--quit-on-end",
            "--seed", str(self._seed),
        ]
        traci.start(sumo_cmd)
        self._populate_tl_info()
        try:
            traci.close()
        except Exception:
            pass

    def _populate_tl_info(self):
        self.tl_ids = list(traci.trafficlight.getIDList())
        if not self.tl_ids:
            # Fallback: add all junctions as dummy TL entries
            print("⚠️  No TraCI TLS found — using junction IDs as fallback.")
            self.tl_ids = ["dummy"]
        self._n_tls = len(self.tl_ids)
        self.tl_lanes = {}
        self.tl_positions = {}
        for tl_id in self.tl_ids:
            lanes = set()
            try:
                links = traci.trafficlight.getControlledLinks(tl_id)
                for link in links:
                    if link and link[0]:
                        lanes.add(link[0][0])
            except Exception:
                pass
            self.tl_lanes[tl_id] = list(lanes)
            if lanes:
                try:
                    shape = traci.lane.getShape(list(lanes)[0])
                    self.tl_positions[tl_id] = shape[-1]
                except Exception:
                    self.tl_positions[tl_id] = (0.0, 0.0)
            else:
                self.tl_positions[tl_id] = (0.0, 0.0)
        max_lanes = max((len(v) for v in self.tl_lanes.values()), default=4)
        self._max_lanes_per_tl = max(max_lanes, 1)
        self._obs_dim = self._n_tls * self._max_lanes_per_tl * self.LANE_OBS_DIM
        print(f"    ↳ TLS: {self._n_tls}, max lanes/TL: {self._max_lanes_per_tl}, obs_dim: {self._obs_dim}")

    # ─────────────────────────────────
    # Gymnasium API
    # ─────────────────────────────────

    def reset(self, *, seed=None, options=None):
        super().reset(seed=seed)
        self._step_num = 0
        self._done = False
        self._prev_waiting = 0.0
        self._vehicles_arrived = 0

        # Close any existing SUMO session
        try:
            traci.close()
        except Exception:
            pass

        sumo_bin = "sumo-gui.exe" if self.gui else "sumo.exe"
        sumo_cmd = [
            os.path.join(config.SUMO_BIN, sumo_bin),
            "-c", self.sumo_cfg,
            "--start",
            "--quit-on-end",
            "--seed", str(self._seed),
        ]
        traci.start(sumo_cmd)
        self._populate_tl_info()

        obs = self._get_obs()
        return obs, {}

    def _apply_action(self, action):
        for i, tl_id in enumerate(self.tl_ids):
            target_phase = int(action[i]) % self.MAX_PHASES
            try:
                n_phases = len(traci.trafficlight.getAllProgramLogics(tl_id)[0].phases)
                safe_phase = target_phase % max(n_phases, 1)
                traci.trafficlight.setPhase(tl_id, safe_phase)
            except Exception:
                pass

    def step(self, action):
        # Apply action: set phase for each TL
        self._apply_action(action)

        traci.simulationStep()
        self._step_num += 1

        obs     = self._get_obs()
        reward  = self._get_reward()
        done    = self._step_num >= config.SIMULATION_STEPS
        info    = {"step": self._step_num}

        return obs, reward, done, False, info

    def close(self):
        try:
            traci.close()
        except Exception:
            pass

    # ─────────────────────────────────
    # Internals
    # ─────────────────────────────────

    def _get_obs(self) -> np.ndarray:
        obs = np.zeros(self._obs_dim, dtype=np.float32)
        ptr = 0
        for tl_id in self.tl_ids:
            lanes = self.tl_lanes.get(tl_id, [])
            for j in range(self._max_lanes_per_tl):
                if j < len(lanes):
                    lane = lanes[j]
                    try:
                        queue   = traci.lane.getLastStepHaltingNumber(lane)
                        density = traci.lane.getLastStepOccupancy(lane)  # 0..1
                        speed   = traci.lane.getLastStepMeanSpeed(lane)
                        max_spd = traci.lane.getMaxSpeed(lane) or 13.89
                        obs[ptr]     = min(queue / 20.0, 1.0)
                        obs[ptr + 1] = float(density)
                        obs[ptr + 2] = min(speed / max_spd, 1.0)
                    except Exception:
                        pass
                ptr += self.LANE_OBS_DIM
        return obs

    def _get_reward(self) -> float:
        # ── Waiting time penalty ──
        total_waiting = 0.0
        for vid in traci.vehicle.getIDList():
            try:
                total_waiting += traci.vehicle.getAccumulatedWaitingTime(vid)
            except Exception:
                pass

        waiting_delta = total_waiting - self._prev_waiting
        self._prev_waiting = total_waiting

        # ── Throughput bonus ──
        arrived = traci.simulation.getArrivedNumber()
        throughput_bonus = arrived * 5.0
        self._vehicles_arrived += arrived

        # ── Emergency vehicle speed bonus ──
        ev_bonus = 0.0
        for vid in traci.vehicle.getIDList():
            try:
                if traci.vehicle.getVehicleClass(vid) == "emergency":
                    spd = traci.vehicle.getSpeed(vid)
                    ev_bonus += spd * 0.5   # reward clearing the path
            except Exception:
                pass

        reward = -waiting_delta * 0.01 + throughput_bonus + ev_bonus
        return float(reward)
