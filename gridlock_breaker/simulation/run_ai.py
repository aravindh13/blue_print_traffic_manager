"""
simulation/run_ai.py

Runs the SUMO 4×4 grid with PPO-based adaptive signal control +
emergency vehicle preemption + fail-safe fallback mode.

Usage:
    python simulation/run_ai.py
    python simulation/run_ai.py --gui
    python simulation/run_ai.py --steps 1800
    python simulation/run_ai.py --no-ppo    # run with only heuristic + preemption (no PPO)
"""

import os
import sys
import sqlite3
import math
import argparse

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import config
import traci
import traci.exceptions
import numpy as np


# ─────────────────────────────────────────────
# DB helpers (same schema as run_baseline.py)
# ─────────────────────────────────────────────

def get_db() -> sqlite3.Connection:
    os.makedirs(os.path.dirname(config.DB_PATH), exist_ok=True)
    conn = sqlite3.connect(config.DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS traffic_metrics (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            mode        TEXT,
            step        INTEGER,
            avg_waiting REAL,
            queue_length INTEGER,
            avg_speed   REAL,
            throughput  INTEGER,
            co2_total   REAL
        );
        CREATE TABLE IF NOT EXISTS signal_logs (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            mode      TEXT,
            step      INTEGER,
            tl_id     TEXT,
            phase_idx INTEGER,
            duration  REAL
        );
        CREATE TABLE IF NOT EXISTS emergency_events (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            mode       TEXT,
            step       INTEGER,
            vehicle_id TEXT,
            status     TEXT,
            tl_id      TEXT
        );
    """)
    conn.commit()
    return conn


# ─────────────────────────────────────────────
# Emergency Preemption Agent
# ─────────────────────────────────────────────

def _dist(p1, p2):
    return math.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2)


class EmergencyPreemptionAgent:
    def __init__(self, conn: sqlite3.Connection, mode: str = "ai"):
        self.conn  = conn
        self.mode  = mode
        self.active_evs: dict = {}   # {vid: {tl_id: (orig_phase, orig_prog)}}
        self.tl_positions: dict = {}

    def initialize(self):
        for tl_id in traci.trafficlight.getIDList():
            try:
                links = traci.trafficlight.getControlledLinks(tl_id)
                if links and links[0]:
                    shape = traci.lane.getShape(links[0][0][0])
                    self.tl_positions[tl_id] = shape[-1]
            except Exception:
                pass

    def step(self, step_num: int):
        vehicle_ids   = set(traci.vehicle.getIDList())
        current_evs   = {v for v in vehicle_ids if traci.vehicle.getVehicleClass(v) == "emergency"}

        # Clear EVs that have left
        for vid in list(self.active_evs):
            if vid not in current_evs:
                self._clear_corridor(step_num, vid)

        # Update corridors for active EVs
        for vid in current_evs:
            if vid not in self.active_evs:
                self.active_evs[vid] = {}
                self._log(step_num, vid, "DETECTED", "")
            self._update_corridor(step_num, vid)

        # Return set of TL IDs currently under preemption (PPO should not override these)
        preempted_tls = set()
        for state in self.active_evs.values():
            preempted_tls.update(state.keys())
        return preempted_tls

    def _update_corridor(self, step_num: int, vid: str):
        ev_pos = traci.vehicle.getPosition(vid)
        try:
            route  = traci.vehicle.getRoute(vid)
            idx    = traci.vehicle.getRouteIndex(vid)
            remaining = set(route[max(0, idx):])
        except Exception:
            remaining = set()

        for tl_id, tl_pos in self.tl_positions.items():
            if _dist(ev_pos, tl_pos) <= config.EMERGENCY_DETECTION_RADIUS:
                try:
                    lanes = traci.trafficlight.getControlledLanes(tl_id)
                    on_route = any(l.rsplit("_", 1)[0] in remaining for l in lanes)
                    if on_route and tl_id not in self.active_evs[vid]:
                        prog  = traci.trafficlight.getProgram(tl_id)
                        phase = traci.trafficlight.getPhase(tl_id)
                        self.active_evs[vid][tl_id] = (phase, prog)
                        traci.trafficlight.setPhase(tl_id, 0)
                        traci.trafficlight.setPhaseDuration(tl_id, config.CORRIDOR_GREEN_DURATION)
                        self._log(step_num, vid, "PREEMPTING", tl_id)
                except Exception:
                    pass

    def _clear_corridor(self, step_num: int, vid: str):
        state = self.active_evs.pop(vid, {})
        for tl_id, (phase, prog) in state.items():
            try:
                traci.trafficlight.setProgram(tl_id, prog)
                traci.trafficlight.setPhase(tl_id, phase)
            except Exception:
                pass
        self._log(step_num, vid, "CLEARED", "")

    def _log(self, step: int, vid: str, status: str, tl_id: str):
        self.conn.execute(
            "INSERT INTO emergency_events (mode, step, vehicle_id, status, tl_id) VALUES (?,?,?,?,?)",
            (self.mode, step, vid, status, tl_id)
        )
        self.conn.commit()


# ─────────────────────────────────────────────
# Fail-Safe fallback helper
# ─────────────────────────────────────────────

def _apply_failsafe(tl_ids):
    """Revert all TLs to a fixed-timer program when PPO fails."""
    for tl_id in tl_ids:
        try:
            traci.trafficlight.setPhase(tl_id, 0)
            traci.trafficlight.setPhaseDuration(tl_id, config.BASELINE_GREEN)
        except Exception:
            pass


# ─────────────────────────────────────────────
# Observation builder (mirrors env/traffic_env.py)
# ─────────────────────────────────────────────

def _build_obs(tl_ids, tl_lanes, max_lanes, lane_obs_dim=3) -> np.ndarray:
    obs = np.zeros(len(tl_ids) * max_lanes * lane_obs_dim, dtype=np.float32)
    ptr = 0
    for tl_id in tl_ids:
        lanes = tl_lanes.get(tl_id, [])
        for j in range(max_lanes):
            if j < len(lanes):
                lane = lanes[j]
                try:
                    queue   = traci.lane.getLastStepHaltingNumber(lane)
                    density = traci.lane.getLastStepOccupancy(lane)
                    speed   = traci.lane.getLastStepMeanSpeed(lane)
                    max_spd = traci.lane.getMaxSpeed(lane) or 13.89
                    obs[ptr]     = min(queue / 20.0, 1.0)
                    obs[ptr + 1] = float(density)
                    obs[ptr + 2] = min(speed / max_spd, 1.0)
                except Exception:
                    pass
            ptr += lane_obs_dim
    return obs


# ─────────────────────────────────────────────
# Main simulation
# ─────────────────────────────────────────────

def run(gui: bool = False, steps: int = None, use_ppo: bool = True):
    steps = steps or config.SIMULATION_STEPS
    conn  = get_db()

    # Load PPO model (optional)
    model = None
    if use_ppo:
        model_path = config.PPO_MODEL_PATH + ".zip"
        if os.path.exists(model_path):
            from stable_baselines3 import PPO
            model = PPO.load(config.PPO_MODEL_PATH)
            print(f"🤖 PPO model loaded: {model_path}")
        else:
            print(f"⚠️  PPO model not found at {model_path}. Using fail-safe heuristics.")

    sumo_bin = "sumo-gui.exe" if gui else "sumo.exe"
    sumo_cmd = [
        os.path.join(config.SUMO_BIN, sumo_bin),
        "-c", config.AI_CFG,
        "--start", "--quit-on-end",
    ]

    print("🤖 Starting AI simulation (PPO + Preemption + Fail-Safe)...")
    traci.start(sumo_cmd)

    # Discover TLs
    tl_ids   = traci.trafficlight.getIDList()
    tl_lanes = {}
    for tl_id in tl_ids:
        lanes = set()
        for link in traci.trafficlight.getControlledLinks(tl_id):
            if link and link[0]:
                lanes.add(link[0][0])
        tl_lanes[tl_id] = list(lanes)
    max_lanes = max((len(v) for v in tl_lanes.values()), default=4)

    preemption_agent = EmergencyPreemptionAgent(conn, mode="ai")
    preemption_agent.initialize()

    total_arrived  = 0
    fail_safe_mode = False

    try:
        for step in range(steps):
            traci.simulationStep()
            total_arrived += traci.simulation.getArrivedNumber()

            # --- Emergency Preemption (highest priority) ---
            preempted_tls = preemption_agent.step(step)

            # --- PPO or Fail-safe (lower priority; skip preempted TLs) ---
            if model is not None:
                try:
                    obs     = _build_obs(tl_ids, tl_lanes, max_lanes)
                    actions, _ = model.predict(obs, deterministic=True)
                    for i, tl_id in enumerate(tl_ids):
                        if tl_id in preempted_tls:
                            continue   # preemption takes priority
                        target = int(actions[i])
                        try:
                            n_phases = len(traci.trafficlight.getAllProgramLogics(tl_id)[0].phases)
                            traci.trafficlight.setPhase(tl_id, target % max(n_phases, 1))
                        except Exception:
                            pass
                    fail_safe_mode = False
                except Exception as e:
                    # FAIL-SAFE: sensor failure / predict crash → revert to fixed timer
                    if not fail_safe_mode:
                        print(f"⚠️  [FAIL-SAFE] PPO predict error at step {step}: {e}")
                        fail_safe_mode = True
                    _apply_failsafe(tl_ids)

            # --- Metrics Logging ---
            if step % config.METRICS_LOG_INTERVAL == 0:
                vehicle_ids = traci.vehicle.getIDList()
                waiting_times, speeds, co2_total, queue_count = [], [], 0.0, 0
                for vid in vehicle_ids:
                    try:
                        wt  = traci.vehicle.getAccumulatedWaitingTime(vid)
                        spd = traci.vehicle.getSpeed(vid)
                        co2 = traci.vehicle.getCO2Emission(vid)
                        waiting_times.append(wt)
                        speeds.append(spd)
                        co2_total += co2
                        if spd < 0.1:
                            queue_count += 1
                    except Exception:
                        pass

                avg_waiting = sum(waiting_times) / len(waiting_times) if waiting_times else 0
                avg_speed   = sum(speeds) / len(speeds) if speeds else 0

                conn.execute(
                    "INSERT INTO traffic_metrics (mode, step, avg_waiting, queue_length, avg_speed, throughput, co2_total) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?)",
                    ("ai", step, avg_waiting, queue_count, avg_speed, total_arrived, co2_total)
                )

                sig_batch = []
                for tl_id in tl_ids:
                    try:
                        ph  = traci.trafficlight.getPhase(tl_id)
                        dur = traci.trafficlight.getPhaseDuration(tl_id)
                        sig_batch.append(("ai", step, tl_id, ph, dur))
                    except Exception:
                        pass
                if sig_batch:
                    conn.executemany(
                        "INSERT INTO signal_logs (mode, step, tl_id, phase_idx, duration) VALUES (?,?,?,?,?)",
                        sig_batch
                    )
                conn.commit()

            if step % 200 == 0:
                mode_tag = "🚨FAIL-SAFE" if fail_safe_mode else "🤖 PPO"
                n = len(traci.vehicle.getIDList())
                print(f"  AI ({mode_tag}) step {step:4d}/{steps} | vehicles: {n:3d} | arrived: {total_arrived}")

    except traci.exceptions.FatalTraCIError as e:
        print(f"TraCI error: {e}")
    finally:
        traci.close()
        conn.close()
        print(f"\n✅ AI simulation done. Total arrived: {total_arrived}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--gui",    action="store_true")
    parser.add_argument("--steps",  type=int, default=None)
    parser.add_argument("--no-ppo", action="store_true", help="Skip PPO, use fail-safe only")
    args = parser.parse_args()
    run(gui=args.gui, steps=args.steps, use_ppo=not args.no_ppo)
