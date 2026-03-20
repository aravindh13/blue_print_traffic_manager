import os
import sys
import subprocess
import xml.etree.ElementTree as ET
import random
import config

os.makedirs(config.SUMO_DIR, exist_ok=True)

VTYPES_XML = """\
<routes>
    <vType id="car"       accel="2.0" decel="4.5" length="4.5"  minGap="1.0" maxSpeed="13.89" vClass="passenger"  guiShape="passenger"  color="0.6,0.6,0.9" sigma="0.5"/>
    <vType id="bus"       accel="1.0" decel="3.0" length="12.0" minGap="1.5" maxSpeed="11.11" vClass="bus"         guiShape="bus"         color="0.2,0.8,0.2" sigma="0.7"/>
    <vType id="bike"      accel="1.5" decel="3.5" length="1.8"  minGap="0.5" maxSpeed="8.33"  vClass="bicycle"     guiShape="bicycle"     color="1.0,0.8,0.2" sigma="0.4"/>
    <vType id="ambulance" accel="3.0" decel="5.0" length="5.5"  minGap="1.0" maxSpeed="22.22" vClass="emergency"   guiShape="emergency"   color="1,0,0"       sigma="0.1"/>
</routes>
"""

def generate_network():
    netgen = os.path.join(config.SUMO_BIN, "netgenerate.exe")
    netconvert = os.path.join(config.SUMO_BIN, "netconvert.exe")

    # 1. Generate Grid A (Baseline)
    cols = ["A", "B", "C", "D"]
    rows = ["0", "1", "2", "3"]
    all_junctions_a = ",".join(f"{c}{r}" for c in cols for r in rows)
    grid_a_file = os.path.join(config.SUMO_DIR, "grid_A.net.xml")

    print("🏗️  Generating Grid A (Baseline)...")
    subprocess.run([
        netgen, "--grid", "--grid.x-number", "4", "--grid.y-number", "4",
        "--grid.length", "200", "--default.speed", "13.89",
        "--tls.set", all_junctions_a, "--tls.guess.threshold", "0",
        "--tls.cycle.time", "65", "--output-file", grid_a_file, "--no-turnarounds"
    ], check=True, capture_output=True)

    # 2. Generate Grid B (AI) - offset by 2000m on X axis
    # To keep edge IDs distinct, we rename prefix A->E, B->F, C->G, D->H
    cols_b = ["E", "F", "G", "H"]
    all_junctions_b = ",".join(f"{c}{r}" for c in cols_b for r in rows)
    grid_b_file = os.path.join(config.SUMO_DIR, "grid_B.net.xml")

    print("🏗️  Generating Grid B (AI)...")
    subprocess.run([
        netgen, "--grid", "--grid.x-number", "4", "--grid.y-number", "4",
        "--grid.length", "200", "--default.speed", "13.89",
        "--tls.set", all_junctions_a, "--tls.guess.threshold", "0",
        "--tls.cycle.time", "65", "--offset.x", "2000",
        "--alphanumerical-ids", "true", # Using alphanumeric instead of custom, then we rename
        "--output-file", grid_b_file, "--no-turnarounds"
    ], check=True, capture_output=True)

    # Rename junctions and edges in Grid B to ensure exactly zero overlap with Grid A
    tree_b = ET.parse(grid_b_file)
    root_b = tree_b.getroot()
    # Map old ids (A0, A1, etc.) to new ids (E0, E1, etc.)
    rename_map = {}
    for c_a, c_b in zip(cols, cols_b):
        for r in rows:
            rename_map[f"{c_a}{r}"] = f"{c_b}{r}"

    for elem in root_b.iter():
        for attr in ['id', 'from', 'to', 'incLanes', 'via', 'tl']:
            if attr in elem.attrib:
                val = elem.attrib[attr]
                for old_id, new_id in rename_map.items():
                    val = val.replace(old_id, new_id)
                elem.attrib[attr] = val
    tree_b.write(grid_b_file, encoding="UTF-8", xml_declaration=True)

    # 3. Merge Grid A and Grid B into dual_grid.net.xml
    dual_file = os.path.join(config.SUMO_DIR, "dual_grid.net.xml")
    print("🔗 Merging Grid A and Grid B...")
    subprocess.run([
        netconvert,
        "--sumo-net-file", f"{grid_a_file},{grid_b_file}",
        "--output-file", dual_file
    ], check=True, capture_output=True)

    # Clean up temp files
    os.remove(grid_a_file)
    os.remove(grid_b_file)
    print(f"✅  Dual grid network created: {dual_file}")
    
    # We update config to point to dual_file via config.py
    # Since we can't cleanly write to config.py variables from here at runtime for other scripts,
    # we'll overwrite config.NET_FILE to be the new dual_file for our route generation
    config.NET_FILE = dual_file
    return dual_file


def _generate_route_subset(net_file, out_path, seed, prefix, num_vehicles=config.VEHICLE_COUNT_EACH):
    random_trips = os.path.join(config.SUMO_HOME, "tools", "randomTrips.py")
    trips_file   = out_path.replace(".rou.xml", ".trips.xml")
    duarouter    = os.path.join(config.SUMO_BIN, "duarouter.exe")
    
    # Generate trips
    subprocess.run([
        sys.executable, random_trips, "-n", net_file, "-o", trips_file,
        "-e", str(config.SIMULATION_STEPS), "-p", str(3600/num_vehicles),
        "--seed", str(seed), "--fringe-factor", "10", "--validate",
        "--prefix", prefix
    ], check=True, capture_output=True)

    # Route trips
    subprocess.run([
        duarouter, "-n", net_file, "-r", trips_file, "-o", out_path,
        "--ignore-errors", "true", "--no-step-log", "true", "--seed", str(seed)
    ], check=True, capture_output=True)

    tree = ET.parse(out_path)
    root = tree.getroot()
    # Strip existing vTypes
    for existing in root.findall("vType"):
        root.remove(existing)

    vtypes_doc = ET.fromstring(VTYPES_XML)
    for i, vt in enumerate(vtypes_doc.findall("vType")):
        root.insert(i, vt)

    # We want exactly identical traffic loads. A fixed pool guarantees exactly N total vehicles of specific types.
    type_pool = (["car"]*int(num_vehicles*0.7) + ["bus"]*int(num_vehicles*0.14) + 
                 ["bike"]*int(num_vehicles*0.1) + ["ambulance"]*int(num_vehicles*0.06))
    random.seed(seed)
    random.shuffle(type_pool)

    # Filter out vehicles that somehow routed to the OTHER grid
    # A valid Grid A vehicle only uses A,B,C,D edges. A valid Grid B vehicle only uses E,F,G,H.
    valid_vehicles = []
    for v in root.findall("vehicle"):
        route = v.find("route")
        if route is not None:
            edges = route.get("edges", "")
            if prefix == "A_" and any(c in edges for c in ["E", "F", "G", "H"]):
                root.remove(v)
            elif prefix == "B_" and any(c in edges for c in ["A", "B", "C", "D"]):
                root.remove(v)
            else:
                valid_vehicles.append(v)
        else:
            root.remove(v)

    # Enforce vehicle counts
    for j, v in enumerate(valid_vehicles):
        v.set("type", type_pool[j % len(type_pool)])

    tree.write(out_path, encoding="unicode", xml_declaration=True)
    if os.path.exists(trips_file):
        os.remove(trips_file)


def generate_routes(dual_file):
    print("🚗 Generating aligned dual routes...")
    # Generate Baseline routes (Grid A)
    rou_a = os.path.join(config.SUMO_DIR, "grid_A.rou.xml")
    _generate_route_subset(dual_file, rou_a, seed=42, prefix="A_")
    
    # Generate AI routes (Grid B)
    # We use a different seed just to make the actual edge pairings different, 
    # but the density is identical.
    rou_b = os.path.join(config.SUMO_DIR, "grid_B.rou.xml")
    _generate_route_subset(dual_file, rou_b, seed=99, prefix="B_")

    # Merge them into a single dual_grid.rou.xml
    dual_rou = os.path.join(config.SUMO_DIR, "dual_grid.rou.xml")
    
    tree_a = ET.parse(rou_a)
    tree_b = ET.parse(rou_b)
    
    root_merged = ET.Element("routes")
    # Add vtypes once
    vtypes_doc = ET.fromstring(VTYPES_XML)
    for vt in vtypes_doc.findall("vType"):
        root_merged.append(vt)
        
    for v in tree_a.getroot().findall("vehicle"):
        root_merged.append(v)
    for v in tree_b.getroot().findall("vehicle"):
        root_merged.append(v)
        
    # Sort vehicles by depart time so SUMO doesn't complain
    vehicles = root_merged.findall("vehicle")
    for v in vehicles:
        root_merged.remove(v)
    
    vehicles.sort(key=lambda x: float(x.get("depart")))
    for v in vehicles:
        root_merged.append(v)
        
    ET.ElementTree(root_merged).write(dual_rou, encoding="unicode", xml_declaration=True)
    
    os.remove(rou_a)
    os.remove(rou_b)
    print(f"✅  Dual routes written: {dual_rou}")
    return dual_rou


def write_cfg(dual_file, dual_rou):
    cfg_path = os.path.join(config.SUMO_DIR, "dual.sumocfg")
    content = f"""<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <input>
        <net-file value="{os.path.basename(dual_file)}"/>
        <route-files value="{os.path.basename(dual_rou)}"/>
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
    print(f"✅  Dual SUMO config: {cfg_path}")


if __name__ == "__main__":
    dual_file = generate_network()
    dual_rou = generate_routes(dual_file)
    write_cfg(dual_file, dual_rou)
    print("\n🎉  Dual Grid SUMO environment ready!")
