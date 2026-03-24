document.addEventListener('DOMContentLoaded', () => {
    // Current date
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-US', options);

    loadData();
    initMap();
});

let map;
let markers = [];

function initMap() {
    map = L.map('map').setView([20, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
}

async function loadData() {
    try {
        // Load aggregate data
        const csvPath = 'data.csv';
        const response = await fetch(csvPath);
        if (response.ok) {
            const csvText = await response.text();
            renderAggregateStats(parseCSV(csvText));
        }

        // Load map positions and handle real-time stats
        loadPositions();
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

async function loadPositions() {
    try {
        const response = await fetch('latest_positions.csv');
        if (!response.ok) return;

        const csvText = await response.text();
        const positions = parsePositionsCSV(csvText);
        
        window.allFlights = positions; // Store for filtering
        renderMarkers(positions);
        renderLiveStats(positions);
        renderLiveCharts(positions);
        renderTable(positions);
    } catch (e) {
        console.error('Error loading positions:', e);
    }
}

function parsePositionsCSV(text) {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',');
    
    return lines.slice(1).map(line => {
        const v = line.split(',');
        const obj = {};
        headers.forEach((h, i) => obj[h] = v[i]);
        
        return {
            icao24: obj.icao24,
            callsign: obj.callsign?.trim() || 'N/A',
            origin_country: obj.origin_country || 'Unknown',
            lng: parseFloat(obj.longitude),
            lat: parseFloat(obj.latitude),
            velocity: parseFloat(obj.velocity) || 0,
            altitude: parseFloat(obj.geo_altitude) || 0,
            vrate: parseFloat(obj.vertical_rate) || 0,
            on_ground: obj.on_ground === 'True' || obj.on_ground === 'true',
            squawk: obj.squawk || 'None',
            source: obj.position_source || '0',
            true_track: parseFloat(obj.true_track) || 0
        };
    }).filter(p => !isNaN(p.lat) && !isNaN(p.lng));
}

function renderMarkers(positions) {
    markers.forEach(m => map.removeLayer(m));
    markers = [];

    positions.forEach(p => {
        const rotation = p.true_track || 0;
        
        // Color based on altitude
        let color = '#6366f1'; // Default blue
        if (p.altitude > 10000) color = '#a855f7'; // Purple for high altitude
        else if (p.altitude < 3000) color = '#eab308'; // Yellow for low altitude
        
        if (p.squawk && ['7500', '7600', '7700'].includes(p.squawk)) color = '#ef4444'; // Red for emergencies

        const planeIcon = L.divIcon({
            html: `<div style="transform: rotate(${rotation - 45}deg); font-size: 20px; color: ${color}; text-shadow: 0 0 3px rgba(0,0,0,0.5);">✈️</div>`,
            className: 'plane-icon',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });

        const marker = L.marker([p.lat, p.lng], { icon: planeIcon }).addTo(map);

        marker.on('click', () => showDetails(p));
        
        marker.bindTooltip(`${p.callsign}`, { permanent: false, direction: 'top' });
        markers.push(marker);
    });
}

function showDetails(p) {
    document.getElementById('sb-callsign').textContent = p.callsign;
    document.getElementById('sb-icao24').textContent = p.icao24;
    document.getElementById('sb-country').textContent = p.origin_country;
    document.getElementById('sb-altitude').textContent = `${p.altitude.toFixed(0)} m`;
    document.getElementById('sb-velocity').textContent = `${p.velocity.toFixed(1)} m/s`;
    document.getElementById('sb-vrate').textContent = `${p.vrate.toFixed(1)} m/s`;
    document.getElementById('sb-squawk').textContent = p.squawk;
    document.getElementById('sb-source').textContent = `Source ID: ${p.source}`;
    
    const sidebar = document.getElementById('detailsSidebar');
    sidebar.classList.add('active');
}

function parseCSV(text) {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',');
    
    return lines.slice(1).map(line => {
        const values = line.split(',');
        return {
            origin_country: values[0],
            total_flights: parseInt(values[1]) || 0,
            avg_velocity: parseFloat(values[2]) || 0,
            avg_altitude: parseFloat(values[3]) || 0,
            on_ground_count: parseInt(values[4]) || 0
        };
    }).filter(row => row.origin_country);
}

function renderLiveStats(positions) {
    const total = positions.length;
    const onGround = positions.filter(p => p.on_ground).length;
    const inAir = total - onGround;
    const emergencies = positions.filter(p => ['7500', '7600', '7700'].includes(p.squawk)).length;

    document.getElementById('totalFlights').textContent = total.toLocaleString();
    document.getElementById('inAirCount').textContent = inAir.toLocaleString();
    document.getElementById('onGroundCount').textContent = onGround.toLocaleString();
    document.getElementById('emergencyCount').textContent = emergencies;

    if (emergencies > 0) {
        document.getElementById('emergencyCard').classList.add('emergency-pulse');
    } else {
        document.getElementById('emergencyCard').classList.remove('emergency-pulse');
    }
}

function renderLiveCharts(positions) {
    renderAltitudeDistChart(positions);
    renderGroundAirChart(positions);
    renderVerticalRateChart(positions);
    renderFlightsByCountryChart(positions);
}

function renderFlightsByCountryChart(positions) {
    const ctx = document.getElementById('flightsByCountryChart').getContext('2d');
    
    // Aggregate by country
    const counts = {};
    positions.forEach(p => {
        counts[p.origin_country] = (counts[p.origin_country] || 0) + 1;
    });

    // Sort and take top 10
    const sorted = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    if (window.countryChart) window.countryChart.destroy();
    window.countryChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sorted.map(s => s[0]),
            datasets: [{
                label: 'Aircraft Count',
                data: sorted.map(s => s[1]),
                backgroundColor: '#6366f1'
            }]
        },
        options: {
            indexAxis: 'y', // Horizontal bars
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }
        }
    });
}

function renderAltitudeDistChart(positions) {
    const ctx = document.getElementById('altitudeDistChart').getContext('2d');
    const bins = [0, 2000, 4000, 6000, 8000, 10000, 12000, 14000];
    const data = bins.map((bin, i) => {
        return positions.filter(p => p.altitude >= bin && (i === bins.length - 1 || p.altitude < bins[i+1])).length;
    });

    if (window.altChart) window.altChart.destroy();
    window.altChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: bins.map(b => `${b}m`),
            datasets: [{
                label: 'Aircraft Count',
                data: data,
                fill: true,
                backgroundColor: 'rgba(168, 85, 247, 0.2)',
                borderColor: '#a855f7',
                tension: 0.4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function renderGroundAirChart(positions) {
    const ctx = document.getElementById('groundAirChart').getContext('2d');
    const ground = positions.filter(p => p.on_ground).length;
    const air = positions.length - ground;

    if (window.gaChart) window.gaChart.destroy();
    window.gaChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['On Ground', 'In Air'],
            datasets: [{
                data: [ground, air],
                backgroundColor: ['#eab308', '#6366f1'],
                borderWidth: 0
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
}

function renderVerticalRateChart(positions) {
    const ctx = document.getElementById('verticalRateChart').getContext('2d');
    const climbing = positions.filter(p => p.vrate > 0.5).length;
    const descending = positions.filter(p => p.vrate < -0.5).length;
    const cruising = positions.length - climbing - descending;

    if (window.vrChart) window.vrChart.destroy();
    window.vrChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Climbing', 'Cruising', 'Descending'],
            datasets: [{
                data: [climbing, cruising, descending],
                backgroundColor: ['#10b981', '#6366f1', '#f43f5e']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

function renderTable(positions) {
    const tbody = document.querySelector('#flightTable tbody');
    tbody.innerHTML = '';

    positions.sort((a, b) => b.altitude - a.altitude).slice(0, 50).forEach(p => {
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.onclick = () => showDetails(p);
        
        const statusClass = p.on_ground ? 'text-muted' : (p.vrate > 1 ? 'text-accent' : '');
        
        tr.innerHTML = `
            <td><b>${p.callsign}</b></td>
            <td>${p.origin_country}</td>
            <td>${p.velocity.toFixed(0)} m/s</td>
            <td>${p.altitude.toFixed(0)} m</td>
            <td style="color: ${p.vrate > 0 ? '#10b981' : (p.vrate < 0 ? '#f43f5e' : 'inherit')}">
                ${p.vrate > 0 ? '↑' : (p.vrate < 0 ? '↓' : '→')} ${Math.abs(p.vrate).toFixed(1)}
            </td>
            <td>${p.on_ground ? '📍 Ground' : '✈️ Airborne'}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Event Listeners
document.getElementById('closeSidebar').addEventListener('click', () => {
    document.getElementById('detailsSidebar').classList.remove('active');
});

document.getElementById('flightSearch').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = window.allFlights.filter(p => 
        p.callsign.toLowerCase().includes(term) || 
        p.origin_country.toLowerCase().includes(term) ||
        p.icao24.toLowerCase().includes(term)
    );
    renderMarkers(filtered);
    renderTable(filtered);
});

// Helper functions for aggregate data if needed
function renderAggregateStats(data) {
    // keeping compatibility with original data.csv if needed
}
