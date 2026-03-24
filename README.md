# Flight Operations Airflow Pipeline

A complete data engineering pipeline built with Apache Airflow, implementing a Medallion Architecture (Bronze, Silver, Gold) to process and visualize real-time flight data from the OpenSky API.

## 🏗️ Architecture

The project follows the **Medallion Architecture** to ensure data quality and structured processing:

- **Bronze Layer**: Raw ingestion of flight data from OpenSky API.
- **Silver Layer**: Cleaned and transformed data (deduplication, normalization).
- **Gold Layer**: Aggregated business-level metrics (flights by country, avg altitude, etc.).
- **Reporting**: Modern interactive dashboard for visualizing Gold layer insights.

## 📁 Project Structure

```text
flight-ops-airflow/
├── dags/                   # Airflow DAG definitions
│   └── flight_pipeline.py  # Main ETL orchestrator
├── scripts/                # Python processing scripts
│   ├── bronze_ingest.py    # API Data Ingestion
│   ├── silver_transform.py # Data Cleaning
│   └── gold_aggregate.py   # Metric Aggregation
├── data/                   # Data Lakehouse (Local)
│   ├── bronze/             # Raw JSON/CSV
│   ├── silver/             # Cleaned Parquet/CSV
│   └── gold/               # Final Analytics CSV
├── dashboard/              # Reporting Tool
│   ├── index.html          # Dashboard UI
│   ├── style.css           # Premium Styling
│   └── app.js              # Visualization Logic
├── docker-compose.yml       # Infrastructure (Airflow, Postgres)
└── requirements.txt         # Python Dependencies
```

## 🚀 Getting Started

### 1. Prerequisites
- Docker & Docker Compose
- Python 3.10+
- OpenSky Network Account (Optional for higher rate limits)

### 2. Infrastructure Setup
Spin up the Airflow environment:
```bash
docker-compose up -d
```
Access the Airflow UI at `http://localhost:8080`.

### 3. Running the Pipeline
- Unpause the `flights_ops_medallion_pipeline` DAG in Airflow.
- The pipeline will automatically fetch, clean, and aggregate flight data.

### 4. Viewing the Dashboard
The dashboard provides a premium visual interface for the Gold data.
```bash
cd dashboard
python -m http.server 8000
```
Open `http://localhost:8000` in your browser.

## 📊 Analytics Dashboard
Features include:
- **Real-time KPIs**: Total flights, unique countries, and flight performance.
- **Geographic Insights**: Bar chart of flights by origin country.
- **Performance Analysis**: Scatter plot of Altitude vs. Velocity.
- **Detailed Metrics**: Full searchable breakdown of country-level flight stats.

## 🛠️ Tech Stack
- **Orchestration**: Apache Airflow
- **Data Processing**: Python (Pandas)
- **Visualization**: Chart.js, HTML5, Vanilla CSS
- **Infrastructure**: Docker
