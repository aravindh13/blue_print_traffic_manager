"""
simulation/run_baseline.py

Runs the SUMO 4×4 grid with FIXED-TIMER signals (no TraCI signal override).
Collects KPIs and logs them to SQLite with mode='baseline'.

Usage:
    python simulation/run_baseline.py
    python simulation/run_baseline.py --gui
    python simulation/run_baseline.py --steps 1800   # shorter run
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

# ─────────────────────────────────────────────
# DB helpers
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
# Simulation
# ─────────────────────────────────────────────

def run(gui: bool = False, steps: int = None):
    steps = steps or config.SIMULATION_STEPS
    conn  = get_db()
    cursor = conn.cursor()

    sumo_bin = "sumo-gui.exe" if gui else "sumo.exe"
    sumo_cmd = [
        os.path.join(config.SUMO_BIN, sumo_bin),
        "-c", config.BASELINE_CFG,
        "--start", "--quit-on-end",
    ]

    print("🚦 Starting BASELINE simulation (fixed-timer signals)...")
    traci.start(sumo_cmd)

    total_arrived = 0

    try:
        for step in range(steps):
            traci.simulationStep()

            arrived_now = traci.simulation.getArrivedNumber()
            total_arrived += arrived_now

            if step % config.METRICS_LOG_INTERVAL == 0:
                vehicle_ids = traci.vehicle.getIDList()

                if vehicle_ids:
                    waiting_times = []
                    speeds        = []
                    queue_count   = 0
                    co2_total     = 0.0

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
                else:
                    avg_waiting = avg_speed = co2_total = 0.0
                    queue_count = 0

                cursor.execute(
                    "INSERT INTO traffic_metrics (mode, step, avg_waiting, queue_length, avg_speed, throughput, co2_total) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?)",
                    ("baseline", step, avg_waiting, queue_count, avg_speed, total_arrived, co2_total)
                )
                conn.commit()

                # Signal logs
                sig_batch = []
                for tl_id in traci.trafficlight.getIDList():
                    try:
                        ph  = traci.trafficlight.getPhase(tl_id)
                        dur = traci.trafficlight.getPhaseDuration(tl_id)
                        sig_batch.append(("baseline", step, tl_id, ph, dur))
                    except Exception:
                        pass
                if sig_batch:
                    cursor.executemany(
                        "INSERT INTO signal_logs (mode, step, tl_id, phase_idx, duration) VALUES (?,?,?,?,?)",
                        sig_batch
                    )
                    conn.commit()

            if step % 200 == 0:
                n = len(traci.vehicle.getIDList())
                print(f"  BASELINE step {step:4d}/{steps} | vehicles: {n:3d} | total arrived: {total_arrived}")

    except traci.exceptions.FatalTraCIError as e:
        print(f"TraCI error: {e}")
    finally:
        traci.close()
        conn.close()
        print(f"\n✅ Baseline simulation done. Total vehicles arrived: {total_arrived}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--gui",   action="store_true")
    parser.add_argument("--steps", type=int, default=None)
    args = parser.parse_args()
    run(gui=args.gui, steps=args.steps)
