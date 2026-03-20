"""
run_dual.py

Runs the Simultaneous Dual Grid simulation:
  Grid A (Baseline): Runs on fixed-timer logic (handled natively by SUMO).
  Grid B (AI): Controlled by the PPO reinforcement learning agent.

Metrics are logged concurrently for both grids per time step to the SQLite database.
"""

import os
import traci
import sqlite3
import numpy as np
import time
from stable_baselines3 import PPO

import config
from env.traffic_env import TrafficEnv

def init_db():
    conn = sqlite3.connect(config.DB_PATH)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS dual_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    step INTEGER,
                    
                    grid_a_waiting REAL,
                    grid_a_queue INTEGER,
                    grid_a_throughput INTEGER,
                    grid_a_speed REAL,
                    grid_a_co2 REAL,
                    
                    grid_b_waiting REAL,
                    grid_b_queue INTEGER,
                    grid_b_throughput INTEGER,
                    grid_b_speed REAL,
                    grid_b_co2 REAL
                )''')
    conn.commit()
    return conn

def get_grid_vehicles(prefix):
    """Returns vehicles currently in the given grid (identified by edge prefix 'A'..'D' or 'E'..'H')"""
    vehicles = traci.vehicle.getIDList()
    valid_edge_prefixes = ['A','B','C','D'] if prefix == 'A' else ['E','F','G','H']
    
    grid_vehs = []
    for v in vehicles:
        try:
            edge = traci.vehicle.getRoadID(v)
            if any(edge.startswith(p) for p in valid_edge_prefixes):
                grid_vehs.append(v)
        except traci.exceptions.TraCIException:
            pass
    return grid_vehs

def get_grid_metrics(grid_vehs):
    if not grid_vehs:
        return 0.0, 0, 0, 0.0, 0.0
        
    total_waiting = 0.0
    queue = 0
    total_speed = 0.0
    total_co2 = 0.0
    throughput = 0  # We will track throughput via arrived list separately
    
    for v in grid_vehs:
        try:
            waiting = traci.vehicle.getWaitingTime(v)
            speed = traci.vehicle.getSpeed(v)
            co2 = traci.vehicle.getCO2Emission(v)
            
            total_waiting += waiting
            total_speed += speed
            total_co2 += co2
            if speed < 0.1:
                queue += 1
        except traci.exceptions.TraCIException:
            pass
            
    avg_waiting = total_waiting / len(grid_vehs)
    avg_speed = total_speed / len(grid_vehs)
    return avg_waiting, queue, throughput, avg_speed, total_co2


def run_dual_simulation():
    print("🚦 Starting DUAL SIMULATION (Grid A: Baseline, Grid B: AI)...")
    
    conn = init_db()
    c = conn.cursor()
    c.execute("DELETE FROM dual_metrics")
    conn.commit()

    # Create dummy environment just to load PPO + get observation functions
    env = TrafficEnv(gui=False)
    # Force the dual config
    env.sumo_cfg = os.path.join(config.SUMO_DIR, "dual.sumocfg")
    
    # We only want the AI to control Grid B TLS (E0..H3)
    cols_b = ["E", "F", "G", "H"]
    rows = ["0", "1", "2", "3"]
    grid_b_tls = [f"{c}{r}" for c in cols_b for r in rows]
    
    try:
        model = PPO.load(config.PPO_MODEL_PATH)
        use_ppo = True
        print("✅ PPO model loaded for Grid B control")
    except Exception as e:
        print("⚠️ PPO model not found. Run train_ppo.py first! Falling back to fail-safe.")
        use_ppo = False
        model = None

    # Start SUMO
    sumo_cmd = [
        os.path.join(config.SUMO_BIN, "sumo-gui.exe"),
        "-c", env.sumo_cfg,
        "--start", "--quit-on-end",
        "--step-length", str(config.STEP_LENGTH)
    ]
    traci.start(sumo_cmd)
    
    env._populate_tl_info() # Sets up internal lane caching
    
    # Filter environment's TL list to ONLY be Grid B
    env.tl_ids = [tl for tl in env.tl_ids if tl in grid_b_tls]
    env._n_tls = len(env.tl_ids)
    # Recalculate observation dimension for just these 16 TLs
    env._obs_dim = env._n_tls * env._max_lanes_per_tl * env.LANE_OBS_DIM
    
    obs = env._get_obs()
    
    arrived_a = 0
    arrived_b = 0

    for step in range(config.SIMULATION_STEPS):
        traci.simulationStep()
        
        # Slow down the Python loop so we can visually watch the simulation
        time.sleep(0.03)
        
        # Determine Grid B actions from PPO
        if use_ppo and step % config.ACTION_INTERVAL == 0:
            action, _ = model.predict(obs, deterministic=True)
            env._apply_action(action)
            obs = env._get_obs()

        # Track arrived vehicles to assign throughput to grids
        arrived_this_step = traci.simulation.getArrivedIDList()
        for v in arrived_this_step:
            if v.startswith("A_"):
                arrived_a += 1
            elif v.startswith("B_"):
                arrived_b += 1

        # Logging metrics every 10 steps
        if step % 10 == 0:
            vehs_a = get_grid_vehicles('A')
            vehs_b = get_grid_vehicles('B')
            
            wa, qa, _, sa, ca = get_grid_metrics(vehs_a)
            wb, qb, _, sb, cb = get_grid_metrics(vehs_b)
            
            c.execute('''INSERT INTO dual_metrics 
                         (step, grid_a_waiting, grid_a_queue, grid_a_throughput, grid_a_speed, grid_a_co2,
                                grid_b_waiting, grid_b_queue, grid_b_throughput, grid_b_speed, grid_b_co2)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                      (step, wa, qa, arrived_a, sa, ca, wb, qb, arrived_b, sb, cb))
            conn.commit()
            
        if step % 200 == 0:
            print(f"Step {step:4d} | Grid A (Base): {arrived_a} arrived | Grid B (AI): {arrived_b} arrived")

    try:
        traci.close()
    except Exception:
        pass
        
    print(f"✅ Dual simulation done. Final Throughput -> Grid A: {arrived_a}, Grid B: {arrived_b}")

if __name__ == "__main__":
    run_dual_simulation()
