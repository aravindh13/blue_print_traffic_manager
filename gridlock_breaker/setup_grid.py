"""
setup_grid.py

Generates a synthetic 4×4 grid SUMO network for the Gridlock-Breaker
comparative study. Uses netgenerate for the network, then randomTrips.py
+ duarouter for valid routed demand with mixed vehicle types.

Produces in sumo/:
  grid.net.xml          - 4×4 grid with TLS on every intersection
  grid_baseline.rou.xml - 50 valid routed vehicles for baseline sim
  grid_ai.rou.xml       - 50 valid routed vehicles for AI sim
  baseline.sumocfg
  ai.sumocfg
"""

import os
import sys
import subprocess

import config

os.makedirs(config.SUMO_DIR, exist_ok=True)
os.makedirs(os.path.dirname(config.DB_PATH), exist_ok=True)
os.makedirs(config.LOG_DIR, exist_ok=True)
os.makedirs(config.MODEL_DIR, exist_ok=True)


# ─────────────────────────────────────────────────────────────────────────────
# Step 1 ── Generate 4×4 grid network
# ─────────────────────────────────────────────────────────────────────────────

def generate_network():
    netgen = os.path.join(config.SUMO_BIN, "netgenerate.exe")

    # For a 4×4 grid netgenerate uses junction IDs: A0,A1,A2,A3,B0,...,D3
    cols = ["A", "B", "C", "D"]
    rows = ["0", "1", "2", "3"]
    all_junctions = ",".join(f"{c}{r}" for c in cols for r in rows)  # A0,A1,...,D3

    cmd = [
        netgen,
        "--grid",
        "--grid.x-number", "4",
        "--grid.y-number", "4",
        "--grid.length", "200",
        "--default.speed", "13.89",           # 50 km/h
        "--tls.set", all_junctions,           # explicitly set TLS on all 16 junctions
        "--tls.guess.threshold", "0",         # ensure tls.guess also fires
        "--tls.cycle.time", "65",             # 30s green + 5s yellow + 30s red
        "--output-file", config.NET_FILE,
        "--no-turnarounds",
    ]
    print("🏗️  Generating 4×4 grid network with TLS on all 16 junctions...")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print("netgenerate stderr:", result.stderr[-1000:])
        raise RuntimeError("netgenerate failed. Ensure SUMO is installed at " + config.SUMO_HOME)
    print(f"✅  Grid network: {config.NET_FILE}")

    # Verify TLS were created
    import sumolib
    net = sumolib.net.readNet(config.NET_FILE)
    tls = net.getTrafficLights()
    print(f"    ↳ Intersections with TLS: {len(tls)}")
    if len(tls) == 0:
        raise RuntimeError(
            "netgenerate produced 0 traffic lights. "
            "Check your SUMO version supports --tls.set for grid networks."
        )


# ─────────────────────────────────────────────────────────────────────────────
# Step 2 ── Generate valid routes via randomTrips + duarouter
# ─────────────────────────────────────────────────────────────────────────────

VTYPES_XML = """\
<routes>
    <vType id="car"       accel="2.0" decel="4.5" length="4.5"  minGap="1.0" maxSpeed="13.89" vClass="passenger"  guiShape="passenger"  color="0.6,0.6,0.9" sigma="0.5"/>
    <vType id="bus"       accel="1.0" decel="3.0" length="12.0" minGap="1.5" maxSpeed="11.11" vClass="bus"         guiShape="bus"         color="0.2,0.8,0.2" sigma="0.7"/>
    <vType id="bike"      accel="1.5" decel="3.5" length="1.8"  minGap="0.5" maxSpeed="8.33"  vClass="bicycle"     guiShape="bicycle"     color="1.0,0.8,0.2" sigma="0.4"/>
    <vType id="ambulance" accel="3.0" decel="5.0" length="5.5"  minGap="1.0" maxSpeed="22.22" vClass="emergency"   guiShape="emergency"   color="1,0,0"       sigma="0.1"/>
</routes>
"""

def _generate_route_file(out_path: str, seed: int):
    """
    Use randomTrips.py (which generates edge-level OD trips guaranteed to be
    valid on the network) + duarouter (which finds shortest-path routes), then
    inject custom vType declarations and vehicle type assignments.
    """
    random_trips = os.path.join(config.SUMO_HOME, "tools", "randomTrips.py")
    trips_file   = out_path.replace(".rou.xml", ".trips.xml")
    duarouter    = os.path.join(config.SUMO_BIN, "duarouter.exe")

    # 1. Generate trips (no vType yet — we assign below)
    trips_cmd = [
        sys.executable, random_trips,
        "-n", config.NET_FILE,
        "-o", trips_file,
        "-e", str(config.SIMULATION_STEPS),
        "-p", "60",                           # one vehicle every 60s → ~60 vehicles
        "--seed", str(seed),
        "--fringe-factor", "10",
        "--validate",
    ]
    print(f"  ↳ Generating trips (seed={seed})...")
    result = subprocess.run(trips_cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print("randomTrips stderr:", result.stderr[-500:])
        raise RuntimeError("randomTrips.py failed")

    # 2. Convert trips → routes via duarouter
    rou_cmd = [
        duarouter,
        "-n", config.NET_FILE,
        "-r", trips_file,
        "-o", out_path,
        "--ignore-errors", "true",
        "--no-step-log", "true",
        "--seed", str(seed),
    ]
    print(f"  ↳ Running duarouter to generate routes...")
    subprocess.run(rou_cmd, capture_output=True, text=True)

    # 3. Inject vType declarations at the top and re-assign random vehicle types
    import xml.etree.ElementTree as ET
    import random
    random.seed(seed)

    tree = ET.parse(out_path)
    root = tree.getroot()

    # Remove any existing vType nodes (duarouter adds none, but be safe)
    for existing in root.findall("vType"):
        root.remove(existing)

    # Insert our vTypes before any vehicles
    vtypes_doc = ET.fromstring(VTYPES_XML)
    for i, vt in enumerate(vtypes_doc.findall("vType")):
        root.insert(i, vt)

    # Assign types: 70% car, 14% bus, 10% bike, 6% ambulance
    type_pool = (["car"]*70 + ["bus"]*14 + ["bike"]*10 + ["ambulance"]*6)
    random.shuffle(type_pool)

    vehicles = root.findall("vehicle")
    print(f"  ↳ {len(vehicles)} valid vehicles generated")
    for j, v in enumerate(vehicles):
        v.set("type", type_pool[j % len(type_pool)])

    tree.write(out_path, encoding="unicode", xml_declaration=True)
    # Clean up trips file
    if os.path.exists(trips_file):
        os.remove(trips_file)

    print(f"✅  Routes written: {out_path}")


def generate_routes():
    print("🚗 Generating baseline routes...")
    _generate_route_file(config.BASELINE_ROU_FILE, seed=42)
    print("🚗 Generating AI routes...")
    _generate_route_file(config.AI_ROU_FILE, seed=99)


# ─────────────────────────────────────────────────────────────────────────────
# Step 3 ── Write SUMO config files
# ─────────────────────────────────────────────────────────────────────────────

def _write_cfg(cfg_path: str, rou_file: str):
    content = f"""<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <input>
        <net-file value="{os.path.basename(config.NET_FILE)}"/>
        <route-files value="{os.path.basename(rou_file)}"/>
    </input>
    <time>
        <begin value="0"/>
        <end value="{config.SIMULATION_STEPS}"/>
        <step-length value="{config.STEP_LENGTH}"/>
    </time>
    <processing>
        <ignore-route-errors value="true"/>
        <time-to-teleport value="300"/>
    </processing>
    <report>
        <no-step-log value="true"/>
        <verbose value="false"/>
        <no-warnings value="true"/>
    </report>
</configuration>
"""
    with open(cfg_path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"✅  SUMO config: {cfg_path}")


def write_configs():
    _write_cfg(config.BASELINE_CFG, config.BASELINE_ROU_FILE)
    _write_cfg(config.AI_CFG, config.AI_ROU_FILE)


# ─────────────────────────────────────────────────────────────────────────────
# Entry Point
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    generate_network()
    generate_routes()
    write_configs()
    print("\n🎉  SUMO grid environment ready in:", config.SUMO_DIR)
    print("\nNext steps:")
    print("  python rl/train_ppo.py --timesteps 10000")
    print("  python simulation/run_baseline.py")
    print("  python simulation/run_ai.py")
