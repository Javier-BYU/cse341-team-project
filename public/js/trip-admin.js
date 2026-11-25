
const tripList = document.getElementById('trip-admin-list');
const loadingMessage = document.getElementById('trip-admin-loading');
const editor = document.getElementById('trip-admin-editor');
const form = document.getElementById('trip-admin-form');
const message = document.getElementById('trip-admin-message');

const startSelect = document.getElementById('trip-start');
const endSelect = document.getElementById('trip-end');
const scheduleContainer = document.getElementById('trip-schedules');

let trips = [];
let stations = [];
let schedules = [];

const showMessage = (text) => {
    message.textContent = text;
};

const escapeHtml = (value) =>
    String(value ?? '').replace(/[&<>"']/g, (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[character]);

const fetchData = async (url) => {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Unable to load data');
    }

    return data;
};

const loadData = async () => {
    try {
        const [tripData, stationData, scheduleData] = await Promise.all([
            fetchData('/api/trips'),
            fetchData('/api/stations'),
            fetchData('/api/schedules')
        ]);

        trips = tripData.trips || [];
        stations = stationData.stations || [];
        schedules = scheduleData.schedules || [];

        displayTrips();
        populateStationOptions();
    } catch (error) {
        showMessage(error.message);
    } finally {
        loadingMessage.hidden = true;
    }
};

const displayTrips = () => {
    tripList.innerHTML = '';

    if (trips.length === 0) {
        tripList.textContent = 'No trips found.';
        return;
    }

    trips.forEach((trip) => {
        const item = document.createElement('article');
        item.className = 'trip-admin-item';

        const details = document.createElement('div');
        details.innerHTML = `
            <h3>${escapeHtml(trip.name)}</h3>
            <p>${escapeHtml(trip.region)} — ${escapeHtml(trip.id)}</p>
        `;

        const actions = document.createElement('div');
        actions.className = 'trip-admin-actions';

        const editButton = document.createElement('button');
        editButton.type = 'button';
        editButton.textContent = 'Edit';
        editButton.addEventListener('click', () => editTrip(trip));

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', () => deleteTrip(trip.id));

        actions.append(editButton, deleteButton);
        item.append(details, actions);
        tripList.appendChild(item);
    });
};

const populateStationOptions = () => {
    const options = stations.map((station) => `
        <option value="${escapeHtml(station.id)}">
            ${escapeHtml(station.name)}
        </option>
    `).join('');

    startSelect.innerHTML = options;
    endSelect.innerHTML = options;
};

const populateScheduleOptions = (trip) => {
    scheduleContainer.innerHTML = '';

    schedules.forEach((schedule) => {
        const label = document.createElement('label');
        label.className = 'trip-admin-schedule';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.name = 'scheduleIds';
        checkbox.value = schedule.id;
        checkbox.checked = String(schedule.tripId) === String(trip.id);

        const description = document.createElement('span');
        description.textContent =
            `Schedule ${schedule.id} — ${schedule.departureTime} to ${schedule.arrivalTime}`;

        label.append(checkbox, description);
        scheduleContainer.appendChild(label);
    });
};

const editTrip = (trip) => {
    document.getElementById('trip-id').value = trip.id;
    document.getElementById('trip-name').value = trip.name || '';
    document.getElementById('trip-description').value =
        trip.description || '';
    document.getElementById('trip-region').value = trip.region || '';
    startSelect.value = trip.startStation || '';
    endSelect.value = trip.endStation || '';
    document.getElementById('trip-duration').value = trip.duration || '';
    document.getElementById('trip-distance').value = trip.distance ?? '';
    document.getElementById('trip-highlights').value =
        (trip.highlights || []).join('\n');
    document.getElementById('trip-season').value =
        trip.bestSeason || '';
    document.getElementById('trip-months').value =
        (trip.operatingMonths || []).join(', ');
    document.getElementById('trip-image').value =
        trip.imageUrl || '';

    populateScheduleOptions(trip);

    editor.hidden = false;
    editor.scrollIntoView({ behavior: 'smooth' });
};

const deleteTrip = async (id) => {
    if (!confirm('Are you sure you want to delete this trip?')) {
        return;
    }

    try {
        const response = await fetch(`/api/trips/${encodeURIComponent(id)}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to delete trip');
        }

        showMessage('Trip deleted successfully.');
        editor.hidden = true;
        await loadData();
    } catch (error) {
        showMessage(error.message);
    }
};

form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const id = document.getElementById('trip-id').value;

    const tripData = {
        name: document.getElementById('trip-name').value.trim(),
        description: document.getElementById('trip-description').value.trim(),
        region: document.getElementById('trip-region').value.trim(),
        startStation: startSelect.value,
        endStation: endSelect.value,
        duration: document.getElementById('trip-duration').value.trim(),
        distance: Number(document.getElementById('trip-distance').value),
        highlights: document.getElementById('trip-highlights').value
            .split('\n')
            .map((item) => item.trim())
            .filter(Boolean),
        bestSeason: document.getElementById('trip-season').value.trim(),
        operatingMonths: document.getElementById('trip-months').value
            .split(',')
            .map((item) => Number(item.trim())),
        imageUrl: document.getElementById('trip-image').value.trim()
    };

    try {
        const response = await fetch(`/api/trips/${encodeURIComponent(id)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tripData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to update trip');
        }

        const selectedSchedules = [
            ...scheduleContainer.querySelectorAll(
                'input[name="scheduleIds"]:checked'
            )
        ];

        for (const checkbox of selectedSchedules) {
            const schedule = schedules.find(
                (item) => String(item.id) === checkbox.value
            );

            if (schedule && String(schedule.tripId) !== String(id)) {
                const scheduleResponse = await fetch(
                    `/api/schedules/${encodeURIComponent(schedule.id)}`,
                    {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ tripId: id })
                    }
                );

                const scheduleData = await scheduleResponse.json();

                if (!scheduleResponse.ok) {
                    throw new Error(
                        scheduleData.error || 'Failed to assign schedule'
                    );
                }
            }
        }

        showMessage('Trip updated successfully.');
        editor.hidden = true;
        form.reset();
        await loadData();
    } catch (error) {
        showMessage(error.message);
    }
});

document.getElementById('trip-admin-cancel').addEventListener('click', () => {
    editor.hidden = true;
    form.reset();
});

loadData();
