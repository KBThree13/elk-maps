// Initialize the map
var map = L.map('map').setView([38.489272909796775, -84.75804556192263], 15);  // Set to your community's location

// Load OpenStreetMap tiles
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

let clickedLatLng = null;
let holdTimer = null;
const holdDuration = 500; // Duration in milliseconds to detect a long press

// Handle map clicks with a long press
map.on('mousedown', function (e) {
    holdTimer = setTimeout(function () {
        // Check if the user is authenticated
        fetch('/auth/is_authenticated')
            .then(response => response.json())
            .then(data => {
                if (data.authenticated) {
                    // User is authenticated, show the modal
                    clickedLatLng = e.latlng;
                    document.getElementById('modal').style.display = 'block';
                } else {
                    // User is not authenticated, ask if they want to register
                    const shouldRegister = confirm("You need to be logged in or registered to add a property. Would you like to register?");
                    if (shouldRegister) {
                        window.location.href = '/auth/register';
                    }
                }
            })
            .catch(error => {
                console.error('Error checking authentication:', error);
            });
    }, holdDuration);
});

map.on('mouseup', function () {
    clearTimeout(holdTimer); // Cancel the timer if the mouse is released early
});

map.on('mousemove', function () {
    clearTimeout(holdTimer); // Cancel the timer if the mouse is moved
});

// Load existing properties from the server
fetch('/get_properties')
    .then(response => response.json())
    .then(properties => {
        console.log("Properties fetched:", properties);  // Log the fetched properties

        properties.forEach(property => {
            // Ensure the latitude and longitude are correctly accessed
            const lat = property.latitude;
            const lng = property.longitude;

            if (lat !== undefined && lng !== undefined) {
                // Add the marker only if lat and lng are valid
                addMarker(property);
            } else {
                console.error("Invalid coordinates for property:", property);  // Log any issues
            }
        });
    })
    .catch(error => {
        console.error("Error fetching properties:", error);  // Log any fetch errors
});

// Handle confirm button click
document.getElementById('confirm-btn').addEventListener('click', function() {
    var owner = document.getElementById('property-owner').value;
    var address = document.getElementById('property-address').value;

    if (owner && clickedLatLng) {
        // Add marker to the map
        L.marker([clickedLatLng.lat, clickedLatLng.lng]).addTo(map)
            .bindPopup('<b>' + owner + '</b><br>' + (address || 'No description provided.'))
            .openPopup();

        // Save the property to the database
        fetch('/add_property', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                owner: owner,
                address: address,
                latitude: clickedLatLng.lat,
                longitude: clickedLatLng.lng
            })
        });

        // Hide the modal and reset inputs
        document.getElementById('modal').style.display = 'none';
        document.getElementById('modal-form').reset();
        clickedLatLng = null;
    }
});


// Example function for adding a marker with edit and delete buttons
document.getElementById('cancel-btn').addEventListener('click', function() {
    document.getElementById('editModal').style.display = 'none';
    document.getElementById('modal-form').reset();
});

// Example function for adding a marker with edit and delete buttons
function addMarker(property) {
    const marker = L.marker([property.latitude, property.longitude]).addTo(map)
        .bindPopup(`
            <b>${property.owner}</b><br>${property.address || 'No description provided.'}
            ${property.is_owner ? `
                <br><button class="pill-button edit" onclick="showEditModal(${property.id}, '${property.owner}', '${property.address}', this)">Edit</button>
                <button class="pill-button delete" onclick="deleteProperty(${property.id})">Delete</button>
            ` : ''}
        `).openPopup();

    marker.propertyId = property.id; // Store the property ID in the marker object
}

// Show the edit modal with the current property data
function showEditModal(id, owner, address, button) {
    document.getElementById('edit-property-owner').value = owner;
    document.getElementById('edit-property-address').value = address;
    document.getElementById('editModal').style.display = 'block';

    // Store the associated marker for updating after save
    document.getElementById('confirm-save').marker = L.marker([0, 0], {}); // Placeholder marker object
    map.eachLayer(function (layer) {
        if (layer.propertyId === id) {
            document.getElementById('confirm-save').marker = layer;
        }
    });
}

// Save the updated data on confirmation
document.getElementById('confirm-save').addEventListener('click', function () {
    const updatedName = document.getElementById('edit-property-owner').value;
    const updatedDescription = document.getElementById('edit-property-address').value;
    const marker = this.marker;

    fetch(`/edit_property/${marker.propertyId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            owner: updatedName,
            address: updatedDescription
        })
    }).then(response => response.json())
    .then(data => {
        if (data.success) {
            // Refresh the map or update the marker with new details
            marker.setPopupContent(`
                <b>${updatedName}</b><br>${updatedDescription || 'No description provided.'}
                <br><button class="pill-button edit" onclick="showEditModal(${marker.propertyId}, '${updatedName}', '${updatedDescription}', this)">Edit</button>
                <button class="pill-button delete" onclick="deleteProperty(${marker.propertyId})">Delete</button>
            `);
            document.getElementById('editModal').style.display = 'none';
        }
    });
});

// Function to handle delete
function deleteProperty(id) {
    if (confirm("Are you sure you want to delete this property?")) {
        fetch(`/delete_property/${id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                location.reload();  // Reload the map to remove the deleted pin
            }
        });
    }
}
