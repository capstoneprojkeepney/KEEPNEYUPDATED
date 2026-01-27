mapboxgl.accessToken = 'pk.eyJ1IjoidmFuZXNzYTEwMTEyIiwiYSI6ImNta2FoY2ZzYzF2aTIzZnIyOWdza3RqbWcifQ.ofFcW1pyNuBjqaG1B2LjwA';

let userLocation = [null];  
navigator.geolocation.getCurrentPosition(
    (position) => {
        userLocation = [position.coords.longitude, position.coords.latitude];
        console.log("User location acquired:", userLocation);
        
        new mapboxgl.Marker({ color: 'black' })
            .setLngLat(userLocation)
            .setPopup(new mapboxgl.Popup().setHTML("<p>Your location</p>"))
            .addTo(map);
    },
    (error) => {
        console.warn("Location access denied or unavailable.");
    },
    { enableHighAccuracy: true }
);

const map = new mapboxgl.Map({
    container: 'Map_layer',
    style: 'mapbox://styles/mapbox/light-v11',
    center: [120.930815089594, 14.870229270432086],
    zoom: 11
});

// Search Functionality
const geocoder = new MapboxGeocoder({
    accessToken: mapboxgl.accessToken, // Set the token
    mapboxgl: mapboxgl,                // Set the mapbox-gl instance
    marker: true,                      // Do you want a red marker at the location?
    placeholder: 'Search location...', // Text displayed when empty
});
document.getElementById('Search_Container').appendChild(geocoder.onAdd(map));
// when searched
geocoder.on('result', async (e) => {
    const Ai_container = document.getElementById('Ai_feedback');
    Ai_container.innerHTML = "<em>Analyzing route accessibility...</em>";

    const data = e.result;
    const coords = data.center; 
    const placeName = data.place_name;

    const dataForAI = JSON.stringify(mapData);

    const prompt = `
    Context: We are using mapbox
    I am a commuter in the Philippines using a jeepney/bus app. I am in ${userLocation}
    Goal: I want to go to "${placeName}" at coordinates [${coords}].
    
    My App Data (Available Terminals and Stops): 
    ${dataForAI}

    Task: Compare my destination coordinates with the available stops in the data.
    1. If the destination is near one of the stops, tell me which route to take.
    2. If it is far from all stops, tell me it's not covered by the current routes.
    3. Keep the answer to exactly 1 sentence.
    4. Estimate the fare.
    5. Estimate how congested the jeep will be based on the stops it got through.
    5. Be playful with the response if possible.
    6. If the place is not passable near any terminal or stops, say that the site is still expanding and only has limited data for now
    `;

    const response = await askGemini(prompt);
    Ai_container.innerHTML = response;
});

// Display Map
map.on('load', async () => {

    // Access Terminal info
    // 1. Loop through every TERMINAL
    for (const terminal of mapData.Terminals) {
        const terminalColor = terminal.color
        // Make Terminal Marker
        new mapboxgl.Marker({color: terminalColor}) 
            .setLngLat(terminal.coords)
            .setPopup(new mapboxgl.Popup().setHTML(createTerminalPopupContent(terminal)))
            .addTo(map);
            
        // Access Stop info
        // 2. Loop through every STOP inside this specific terminal
        terminal.stops.forEach((stop) => {
            new mapboxgl.Marker({color: terminalColor, scale: 0.6 })
                .setLngLat(stop.coords)
                .setPopup(new mapboxgl.Popup().setHTML(createStopPopupContent(stop)))
                .addTo(map);
        });

        const startPoint = terminal.coords;
        const stopPoints = terminal.stops.map(stop => stop.coords);
        const allCoords = [startPoint, ...stopPoints];
        const apiString = allCoords.join(';');
        const query = await fetch(
            `https://api.mapbox.com/directions/v5/mapbox/driving/${apiString}?geometries=geojson&overview=full&access_token=${mapboxgl.accessToken}`
        );
        const json = await query.json();
        const route = json.routes[0].geometry;

        const routeID = 'route-' + terminal.name.replace(/\s+/g, '');
        map.addSource(routeID, {
            type: 'geojson',
            data: {
                type: 'Feature',
                geometry: route
            }
        });

        map.addLayer({
            id: routeID,
            type: 'line',
            source: routeID,
            layout: {
                'line-join': 'round',
                'line-cap': 'round'
            },
            paint: {
                'line-color': terminalColor,
                'line-width': 5,
                'line-opacity': 1
            }
        });
    };
});

//add allroutes view
const routesLayer = document.getElementById('Routes_layer');

// Fill routes layer
mapData.Terminals.forEach(terminal => {
    const stopsHTML = terminal.stops.map(stop => `
        <div class="stop-item">
            <p>name: ${stop.name}</p>
            <p>fare: ${stop.fare}</p>
        </div>
    `).join(''); 

    const terminalHTML = `
        <div class="terminal-wrapper" style="border-left: 5px solid ${terminal.color};">
            <h3>${terminal.name}</h3>
            ${stopsHTML}
        </div>
    `;

    routesLayer.innerHTML += terminalHTML;
});


// Functions
function createTerminalPopupContent(terminalData) {
    return `
        <div class="terminalPopup">
            <img src="https://picsum.photos/200">
            <p>Address: ${terminalData.address}</p>
            <p>Terminal name: ${terminalData.name}</p>
            <p>General Stop count: ${terminalData.stops.length}</p>
        </div>
    `;
}

function createStopPopupContent(stopData) {
    return `
        <div class="stopPopup">
            <img src="https://picsum.photos/200">
            <p>name: ${stopData.name}</p>
            <p>fare: ${stopData.fare}</p>
        </div>
    `;
}

function setupUI() {
    const allRoutesBtn = document.getElementById('Allroutes');
    const routesLayer = document.getElementById('Routes_layer');

    allRoutesBtn.addEventListener('click', () => {
        if (routesLayer.style.display === 'none' || routesLayer.style.display === '') {
            routesLayer.style.display = 'block';
            routesLayer.style.opacity = '.9';
        } else {
            routesLayer.style.opacity = '0';
            setTimeout(() => routesLayer.style.display = 'none', 300);
        }
    });
}

setupUI();

