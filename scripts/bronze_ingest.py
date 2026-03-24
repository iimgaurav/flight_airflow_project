import requests
import json
import os
from datetime import datetime 
from pathlib import Path

URL = "https://opensky-network.org/api/states/all"

def run_bronze_ingestion(**context):
    response = requests.get(URL, timeout=30)
    response.raise_for_status()

    data = response.json()
    
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")

    # Ensure the destination directory exists
    dir_path = Path("/opt/airflow/data/bronze/flights")
    dir_path.mkdir(parents=True, exist_ok=True)
    
    file_path = dir_path / f"{timestamp}.json"

    with open(file_path, "w") as f:
        json.dump(data, f)

    context["ti"].xcom_push(key="bronze_file", value=str(file_path))
