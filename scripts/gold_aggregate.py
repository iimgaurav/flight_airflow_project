import pandas as pd
from pathlib import Path

def run_gold_aggregate(**context):
    execution_date = context["ds_nodash"]
    
    # Retrieve silver file path from XCom
    ti = context["ti"]
    silver_file = ti.xcom_pull(key="silver_file", task_ids="silver_transform")

    if not silver_file:
        raise ValueError("No silver file found in XCom")

    df = pd.read_csv(silver_file)

    # Aggregation logic
    agg = (
        df.groupby("origin_country")
        .agg(
            total_flights=("icao24", "count"),
            avg_velocity=("velocity", "mean"),
            avg_altitude=("geo_altitude", "mean"),
            on_ground_count=("on_ground", "sum")
        )
        .reset_index()
    )

    # Ensure gold directory exists
    # If silver_file is /opt/airflow/data/silver/flights/flights_20260322.csv
    # gold_file will be /opt/airflow/data/gold/flights/flights_20260322.csv
    gold_file = Path(silver_file.replace("/silver/", "/gold/"))
    gold_file.parent.mkdir(parents=True, exist_ok=True)

    agg.to_csv(gold_file, index=False)
    
    # Export individual flight positions for the map
    # Filter for active flights with valid coordinates
    positions = df[df["latitude"].notnull() & df["longitude"].notnull()]
    positions_file = Path("/opt/airflow/dashboard/latest_positions.csv")
    if Path("/opt/airflow/dashboard").exists():
        # Export all columns including the new ones
        positions.to_csv(positions_file, index=False)
        print(f"Latest positions synced at {positions_file}")

    # Sync aggregate to dashboard
    dashboard_data = Path("/opt/airflow/dashboard/data.csv")
    if Path("/opt/airflow/dashboard").exists():
        agg.to_csv(dashboard_data, index=False)
        print(f"Dashboard data synced at {dashboard_data}")

    context["ti"].xcom_push(key="gold_file", value=str(gold_file))
    print(f"Gold aggregation created at {gold_file}")