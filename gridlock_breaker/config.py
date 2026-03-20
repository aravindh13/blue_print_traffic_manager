import os
import sys

# ─────────────────────────────────────────────
# SUMO Installation
# ─────────────────────────────────────────────
SUMO_HOME = r"C:\Program Files (x86)\Eclipse\Sumo"
SUMO_BIN  = os.path.join(SUMO_HOME, "bin")

_tools = os.path.join(SUMO_HOME, "tools")
if _tools not in sys.path:
    sys.path.insert(0, _tools)
os.environ.setdefault("SUMO_HOME", SUMO_HOME)

# ─────────────────────────────────────────────
# Project Paths
# ─────────────────────────────────────────────
BASE_DIR  = os.path.dirname(os.path.abspath(__file__))
SUMO_DIR  = os.path.join(BASE_DIR, "sumo")
DB_PATH   = os.path.join(BASE_DIR, "db", "results.db")
LOG_DIR   = os.path.join(BASE_DIR, "logs")
MODEL_DIR = os.path.join(BASE_DIR, "rl", "models")

NET_FILE          = os.path.join(SUMO_DIR, "grid.net.xml")
BASELINE_ROU_FILE = os.path.join(SUMO_DIR, "grid_baseline.rou.xml")
AI_ROU_FILE       = os.path.join(SUMO_DIR, "grid_ai.rou.xml")
BASELINE_CFG      = os.path.join(SUMO_DIR, "baseline.sumocfg")
AI_CFG            = os.path.join(SUMO_DIR, "ai.sumocfg")
PPO_MODEL_PATH    = os.path.join(MODEL_DIR, "ppo_traffic")

# ─────────────────────────────────────────────
# Simulation Parameters
# ─────────────────────────────────────────────
SIMULATION_STEPS    = 3600   # 1 simulated hour
STEP_LENGTH         = 1.0    # seconds per step
METRICS_LOG_INTERVAL = 10    # write to DB every N steps

# ─────────────────────────────────────────────
# Traffic Generation
# ─────────────────────────────────────────────
VEHICLE_COUNT_EACH = 150     # 150 per grid (300 total)
VEHICLE_TYPES      = ["car", "bus", "bike", "ambulance"]

# ─────────────────────────────────────────────
# Baseline Fixed-Timer Signal
# ─────────────────────────────────────────────
BASELINE_GREEN  = 30  # seconds
BASELINE_YELLOW = 5
BASELINE_RED    = 30

# ─────────────────────────────────────────────
# Emergency Preemption
# ─────────────────────────────────────────────
EMERGENCY_DETECTION_RADIUS = 200.0
CORRIDOR_GREEN_DURATION    = 45.0

# ─────────────────────────────────────────────
# PPO RL Training
# ─────────────────────────────────────────────
PPO_TOTAL_TIMESTEPS = 100_000   # reduce to 10_000 for a quick test
PPO_N_STEPS         = 2048
PPO_BATCH_SIZE      = 64
ACTION_INTERVAL     = 10

# ─────────────────────────────────────────────
# API
# ─────────────────────────────────────────────
API_HOST = "0.0.0.0"
API_PORT = 8100
