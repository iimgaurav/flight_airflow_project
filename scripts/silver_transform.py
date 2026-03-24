import json
import pandas as pd
from pathlib import Path

def run_silver_transformation(**context):
    execution_date = context["ds_nodash"]

    # Retrieve the bronze file path from XCom
    ti = context["ti"]
    bronze_file = ti.xcom_pull(key="bronze_file", task_ids="bronze_ingest")

    if not bronze_file:
        raise ValueError("No bronze file found in XCom")

    silver_path = Path("/opt/airflow/data/silver/flights") 
    silver_path.mkdir(parents=True, exist_ok=True)
     
    with open(bronze_file, "r") as f:
        data = json.load(f)

    if not data or "states" not in data or data["states"] is None:
        print("No flight data found in bronze file.")
        return

    df_raw = pd.DataFrame(data["states"])
    
    # OpenSky API 'states' columns (17 items):
    # 0: icao24, 1: callsign, 2: origin_country, 3: time_position, 4: last_contact, 
    # 5: longitude, 6: latitude, 7: baro_altitude, 8: on_ground, 9: velocity, 
    # 10: true_track, 11: vertical_rate, 12: sensors, 13: geo_altitude, 14: squawk, 
    # 15: spi, 16: position_source
    
    df_raw.columns = [
        "icao24", "callsign", "origin_country", "time_position", "last_contact",
        "longitude", "latitude", "baro_altitude", "on_ground", "velocity",
        "true_track", "vertical_rate", "sensors", "geo_altitude", "squawk",
        "spi", "position_source"
    ]

    # Selection for silver layer
    df = df_raw[[
        "icao24", "callsign", "origin_country", "longitude", "latitude", 
        "velocity", "geo_altitude", "on_ground", "true_track",
        "vertical_rate", "squawk", "position_source"
    ]]

    output_file = silver_path / f"flights_{execution_date}.csv"
    df.to_csv(output_file, index=False)

    context["ti"].xcom_push(key="silver_file", value=str(output_file))  
    print(f"Silver file created at {output_file}")