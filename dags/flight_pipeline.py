import sys
from pathlib import Path
from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.utils.dates import days_ago

AIRFLOW_HOME = Path("/opt/airflow")

if str(AIRFLOW_HOME) not in sys.path:
    sys.path.insert(0, str(AIRFLOW_HOME))

from scripts.bronze_ingest import run_bronze_ingestion
from scripts.silver_transform import run_silver_transformation
from scripts.gold_aggregate import run_gold_aggregate

default_args = {
    "owner": "airflow",
    "retries": 1,
    "retry_delay": timedelta(minutes=5),
}

with DAG(
    dag_id="flights_ops_medallion_pipeline",
    start_date=days_ago(1),
    schedule="*/30 * * * *",
    catchup=False,
    default_args=default_args,
    tags=["flights", "medallion"],
) as dag:

    bronze = PythonOperator(
        task_id="bronze_ingest",
        python_callable=run_bronze_ingestion,
    )

    silver = PythonOperator(
        task_id="silver_transform",
        python_callable=run_silver_transformation,
    )

    gold = PythonOperator(
        task_id="gold_aggregate",
        python_callable=run_gold_aggregate,
    )

    bronze >> silver >> gold