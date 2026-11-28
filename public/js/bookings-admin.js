const loadingEl = document.getElementById('bookings-loading');
const errorEl = document.getElementById('bookings-error');
const errorMessageEl = document.getElementById('bookings-error-message');
const emptyEl = document.getElementById('bookings-empty');
const noResultsEl = document.getElementById('bookings-no-results');
const tableEl = document.getElementById('bookings-table');
const listEl = document.getElementById('bookings-list');
const countEl = document.getElementById('bookings-count');
const passengersCountEl = document.getElementById('passengers-count');
const templateEl = document.getElementById('booking-row-template');
const refreshButton = document.getElementById('bookings-refresh');
const updatedEl = document.getElementById('bookings-updated');
const searchInput = document.getElementById('bookings-search');
const feedbackEl = document.getElementById('bookings-feedback');

const editorDialog = document.getElementById('booking-editor-dialog');
const editorForm = document.getElementById('booking-editor-form');
const editorErrorEl = document.getElementById('booking-editor-error');
const tripSelect = document.getElementById('booking-trip');
const scheduleSelect = document.getElementById('booking-schedule');
const ticketClassSelect = document.getElementById('booking-ticket-class');
const travelDaySelect = document.getElementById('booking-travel-day');
const passengerListEl = document.getElementById('booking-passengers-list');
const addPassengerButton = document.getElementById('booking-add-passenger');
const saveButton = document.getElementById('booking-save');
const cancelButton = document.getElementById('booking-editor-cancel');
const closeButton = document.getElementById('booking-editor-close');
const bookingReferenceEl = document.getElementById('booking-editor-reference');

let bookings = [];
let activeBooking = null;
let csrfToken = '';
let ticketClasses = [];
let isSaving = false;
let scheduleRequestId = 0;
let activeSchedules = [];
const pendingDeletes = new Set();

const statusMessages = {
    400: 'Please review the booking details and try again.',
    403: 'You are not authorized to make this change.',
    404: 'This booking or one of its selected options is no longer available.',
    500: 'The server could not complete the request. Please try again later.'
};

const showFeedback = (message, kind = 'success') => {
    feedbackEl.textContent = message;
    feedbackEl.dataset.kind = kind;
    feedbackEl.hidden = false;
};

const clearFeedback = () => {
    feedbackEl.textContent = '';
    feedbackEl.hidden = true;
    delete feedbackEl.dataset.kind;
};

const setEditorError = (message) => {
    editorErrorEl.textContent = message;
    editorErrorEl.hidden = !message;
};

const apiRequest = async (url, options = {}) => {
    const response = await fetch(url, {
        credentials: 'same-origin',
        ...options,
        headers: {
            ...options.headers
        }
    });

    let payload;
    try {
        payload = await response.json();
    } catch {
        payload = null;
    }

    if (response.status === 401) {
        window.location.assign('/login');
        const error = new Error('Your session has expired. Redirecting to login.');
        error.status = response.status;
        throw error;
    }

    if (!response.ok) {
        const error = new Error(
            payload?.error ||
            statusMessages[response.status] ||
            'The request could not be completed.'
        );
        error.status = response.status;
        throw error;
    }

    if (!payload || typeof payload !== 'object') {
        throw new Error('The server returned an invalid response.');
    }

    return payload;
};

const getCsrfToken = async () => {
    if (!csrfToken) {
        const payload = await apiRequest('/api/csrf-token');

        if (typeof payload.csrfToken !== 'string' || !payload.csrfToken) {
            throw new Error('Unable to prepare a secure booking request.');
        }

        csrfToken = payload.csrfToken;
    }

    return csrfToken;
};

const filterBookings = () => {
    const rows = listEl.querySelectorAll('tr');
    const searchTerm = searchInput.value.trim().toLowerCase();
    let visibleRows = 0;

    rows.forEach((row) => {
        const matches = row.dataset.search.includes(searchTerm);
        row.hidden = !matches;

        if (matches) {
            visibleRows++;
        }
    });

    noResultsEl.hidden = visibleRows > 0;
    tableEl.hidden = visibleRows === 0;
};

const createBookingRow = (booking) => {
    const fragment = templateEl.content.cloneNode(true);
    const row = fragment.querySelector('tr');
    const bookingId = String(booking.id || 'N/A');
    const passengers = Array.isArray(booking.passengers)
        ? booking.passengers
        : [];
    const editButton = fragment.querySelector('[data-action="edit"]');
    const deleteButton = fragment.querySelector('[data-action="delete"]');

    fragment.querySelector('[data-field="id"]').textContent = bookingId;
    fragment.querySelector('[data-field="trip"]').textContent =
        booking.tripId || 'N/A';
    fragment.querySelector('[data-field="schedule"]').textContent =
        booking.scheduleId ?? 'N/A';
    fragment.querySelector('[data-field="ticket-class"]').textContent =
        booking.ticketClass || 'N/A';
    fragment.querySelector('[data-field="travel-day"]').textContent =
        booking.selectedDay || 'N/A';
    fragment.querySelector('[data-field="passengers"]').textContent =
        passengers.length;
    fragment.querySelector('[data-field="created-at"]').textContent =
        booking.createdAt
            ? new Date(booking.createdAt).toLocaleDateString()
            : 'N/A';

    row.dataset.bookingId = bookingId;
    row.dataset.search = [
        bookingId,
        booking.tripId,
        booking.scheduleId,
        booking.ticketClass,
        booking.selectedDay,
        ...passengers.flatMap((passenger) => [
            passenger.firstName,
            passenger.lastName,
            passenger.email
        ])
    ]
        .map((value) => String(value ?? ''))
        .join(' ')
        .toLowerCase();

    editButton.setAttribute('aria-label', `Edit booking ${bookingId}`);
    deleteButton.setAttribute('aria-label', `Delete booking ${bookingId}`);

    if (pendingDeletes.has(bookingId)) {
        editButton.disabled = true;
        deleteButton.disabled = true;
    }

    if (!booking.id) {
        editButton.disabled = true;
        deleteButton.disabled = true;
    }

    return fragment;
};

const loadBookings = async () => {
    clearFeedback();
    loadingEl.hidden = false;
    errorEl.hidden = true;
    emptyEl.hidden = true;
    noResultsEl.hidden = true;
    tableEl.hidden = true;
    updatedEl.hidden = true;
    refreshButton.disabled = true;

    try {
        const payload = await apiRequest('/api/bookings');

        if (!Array.isArray(payload.bookings)) {
            throw new Error('The server returned an invalid bookings list.');
        }

        bookings = payload.bookings;
        countEl.textContent = String(bookings.length);

        const totalPassengers = bookings.reduce(
            (total, booking) => total + (
                Array.isArray(booking.passengers)
                    ? booking.passengers.length
                    : 0
            ),
            0
        );
        passengersCountEl.textContent = String(totalPassengers);
        listEl.replaceChildren();

        if (bookings.length === 0) {
            emptyEl.hidden = false;
            return true;
        }

        const fragment = document.createDocumentFragment();
        bookings.forEach((booking) => {
            fragment.append(createBookingRow(booking));
        });
        listEl.append(fragment);

        updatedEl.textContent = `Last updated: ${new Date().toLocaleString()}`;
        updatedEl.hidden = false;
        filterBookings();
        return true;
    } catch (error) {
        errorMessageEl.textContent = error.message;
        errorEl.hidden = false;
        showFeedback(error.message, 'error');
        return false;
    } finally {
        loadingEl.hidden = true;
        refreshButton.disabled = false;
    }
};

const replaceSelectOptions = (select, options, selectedValue, getOption) => {
    select.replaceChildren();

    options.forEach((item) => {
        const option = document.createElement('option');
        const details = getOption(item);
        option.value = String(details.value);
        option.textContent = details.label;
        select.append(option);
    });

    if (
        selectedValue !== undefined &&
        options.some((item) => String(getOption(item).value) === String(selectedValue))
    ) {
        select.value = String(selectedValue);
    }
};

const populateTicketClasses = (selectedClass) => {
    const day = travelDaySelect.value.toLowerCase();
    const availableClasses = ticketClasses.filter(
        (ticketClass) => ticketClass.availableDays.includes(day)
    );

    replaceSelectOptions(
        ticketClassSelect,
        availableClasses,
        selectedClass,
        (ticketClass) => ({
            value: ticketClass.class,
            label: ticketClass.name
        })
    );
    ticketClassSelect.disabled = availableClasses.length === 0;
};

const populateTravelDays = (schedule, selectedDay) => {
    const days = Array.isArray(schedule?.daysOfWeek)
        ? schedule.daysOfWeek
        : [];

    replaceSelectOptions(
        travelDaySelect,
        days,
        selectedDay?.toLowerCase(),
        (day) => ({
            value: day.toLowerCase(),
            label: `${day.charAt(0).toUpperCase()}${day.slice(1).toLowerCase()}`
        })
    );
    travelDaySelect.disabled = days.length === 0;
    populateTicketClasses(ticketClassSelect.value);
};

const populateSchedules = async (tripId, selectedScheduleId, selectedDay) => {
    const requestId = ++scheduleRequestId;
    activeSchedules = [];
    scheduleSelect.disabled = true;
    travelDaySelect.disabled = true;
    ticketClassSelect.disabled = true;
    replaceSelectOptions(scheduleSelect, [], undefined, () => ({}));

    const schedules = await apiRequest(
        `/api/trips/${encodeURIComponent(tripId)}/schedules`
    );

    if (requestId !== scheduleRequestId || tripId !== tripSelect.value) {
        return;
    }

    if (!Array.isArray(schedules) || schedules.length === 0) {
        throw new Error('No active schedules are available for this trip.');
    }

    activeSchedules = schedules;
    replaceSelectOptions(
        scheduleSelect,
        schedules,
        selectedScheduleId,
        (schedule) => ({
            value: schedule.id,
            label: `Schedule ${schedule.id} (${schedule.departureTime}–${schedule.arrivalTime})`
        })
    );
    scheduleSelect.disabled = false;

    const selectedSchedule = schedules.find(
        (schedule) => String(schedule.id) === scheduleSelect.value
    );
    populateTravelDays(selectedSchedule, selectedDay);
};

const populateTrips = async (selectedTripId, selectedScheduleId, selectedDay) => {
    tripSelect.disabled = true;
    scheduleSelect.disabled = true;
    travelDaySelect.disabled = true;
    ticketClassSelect.disabled = true;

    const [payload, classOptions] = await Promise.all([
        apiRequest('/api/trips/available'),
        ticketClasses.length > 0
            ? Promise.resolve(ticketClasses)
            : apiRequest('/api/ticket-classes')
    ]);
    const trips = Array.isArray(payload.trips) ? payload.trips : [];

    if (trips.length === 0) {
        throw new Error('No trips with active schedules are available.');
    }

    if (!Array.isArray(classOptions) || classOptions.length === 0) {
        throw new Error('No ticket classes are available.');
    }

    ticketClasses = classOptions;

    replaceSelectOptions(
        tripSelect,
        trips,
        selectedTripId,
        (trip) => ({
            value: trip.id,
            label: trip.name
        })
    );
    tripSelect.disabled = false;

    await populateSchedules(
        tripSelect.value,
        selectedScheduleId,
        selectedDay
    );
};

const syncPassengerControls = () => {
    const passengerGroups = passengerListEl.querySelectorAll(
        '.booking-passenger'
    );
    addPassengerButton.disabled = passengerGroups.length >= 8;

    passengerGroups.forEach((group, index) => {
        group.querySelector('legend').textContent = `Passenger ${index + 1}`;
        const removeButton = group.querySelector('.booking-passenger-remove');
        removeButton.disabled = passengerGroups.length <= 1;
    });
};

const addPassenger = (passenger = {}) => {
    const group = document.createElement('fieldset');
    group.className = 'booking-passenger';
    const legend = document.createElement('legend');
    group.append(legend);

    const fields = [
        { name: 'firstName', label: 'First name', type: 'text' },
        { name: 'lastName', label: 'Last name', type: 'text' },
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'phone', label: 'Phone', type: 'tel' }
    ];

    fields.forEach((field) => {
        const label = document.createElement('label');
        label.append(document.createTextNode(field.label));
        const input = document.createElement('input');
        input.name = field.name;
        input.type = field.type;
        input.required = true;
        input.value = typeof passenger[field.name] === 'string'
            ? passenger[field.name]
            : '';
        label.append(input);
        group.append(label);
    });

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'booking-passenger-remove';
    removeButton.textContent = 'Remove passenger';
    removeButton.addEventListener('click', () => {
        group.remove();
        syncPassengerControls();
    });
    group.append(removeButton);
    passengerListEl.append(group);
    syncPassengerControls();
};

const openEditor = async (booking) => {
    if (editorDialog.open) {
        return;
    }

    activeBooking = booking;
    isSaving = false;
    editorForm.reset();
    passengerListEl.replaceChildren();
    setEditorError('');
    bookingReferenceEl.textContent = `Booking reference: ${booking.id}`;
    (Array.isArray(booking.passengers) ? booking.passengers : [])
        .forEach((passenger) => addPassenger(passenger));

    if (!editorDialog.open) {
        editorDialog.showModal();
    }

    try {
        await populateTrips(
            booking.tripId,
            booking.scheduleId,
            booking.selectedDay
        );
        populateTicketClasses(booking.ticketClass);
    } catch (error) {
        setEditorError(error.message);
    }

    tripSelect.focus();
};

const closeEditor = () => {
    if (isSaving) {
        return;
    }

    editorDialog.close();
    activeBooking = null;
    setEditorError('');
};

const submitBookingUpdate = async (event) => {
    event.preventDefault();

    if (!activeBooking || isSaving) {
        return;
    }

    if (!editorForm.reportValidity()) {
        return;
    }

    const passengerGroups = passengerListEl.querySelectorAll(
        '.booking-passenger'
    );
    if (passengerGroups.length < 1 || passengerGroups.length > 8) {
        setEditorError('A booking must contain between 1 and 8 passengers.');
        return;
    }

    const passengers = Array.from(passengerGroups, (group) => {
        const passenger = {};
        ['firstName', 'lastName', 'email', 'phone'].forEach((field) => {
            passenger[field] = group.querySelector(`[name="${field}"]`)
                .value
                .trim();
        });
        return passenger;
    });

    const body = {
        scheduleId: Number(scheduleSelect.value),
        tripId: tripSelect.value,
        ticketClass: ticketClassSelect.value,
        selectedDay: travelDaySelect.value,
        passengers
    };

    if (
        !Number.isInteger(body.scheduleId) ||
        body.scheduleId <= 0 ||
        passengers.some((passenger) => (
            !passenger.firstName ||
            !passenger.lastName ||
            !passenger.email ||
            !passenger.phone
        ))
    ) {
        setEditorError('Complete all booking and passenger fields.');
        return;
    }

    isSaving = true;
    saveButton.disabled = true;
    cancelButton.disabled = true;
    closeButton.disabled = true;

    try {
        const token = await getCsrfToken();
        await apiRequest(`/api/bookings/${encodeURIComponent(activeBooking.id)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': token
            },
            body: JSON.stringify(body)
        });

        isSaving = false;
        closeEditor();
        const refreshed = await loadBookings();
        showFeedback(
            refreshed
                ? 'Booking updated successfully.'
                : 'Booking updated, but the list could not be refreshed.',
            refreshed ? 'success' : 'error'
        );
    } catch (error) {
        setEditorError(error.message);
    } finally {
        isSaving = false;
        saveButton.disabled = false;
        cancelButton.disabled = false;
        closeButton.disabled = false;
    }
};

const deleteBooking = async (booking, button) => {
    const bookingId = String(booking.id);

    if (pendingDeletes.has(bookingId)) {
        return;
    }

    const confirmed = window.confirm(
        `Delete booking ${bookingId}? This action cannot be undone.`
    );

    if (!confirmed) {
        return;
    }

    pendingDeletes.add(bookingId);
    button.disabled = true;
    clearFeedback();

    try {
        const token = await getCsrfToken();
        await apiRequest(`/api/bookings/${encodeURIComponent(bookingId)}`, {
            method: 'DELETE',
            headers: {
                'X-CSRF-Token': token
            }
        });

        const refreshed = await loadBookings();
        showFeedback(
            refreshed
                ? `Booking ${bookingId} deleted successfully.`
                : `Booking ${bookingId} was deleted, but the list could not be refreshed.`,
            refreshed ? 'success' : 'error'
        );
    } catch (error) {
        if (error.status === 404) {
            await loadBookings();
        }
        showFeedback(error.message, 'error');
    } finally {
        pendingDeletes.delete(bookingId);
        button.disabled = false;
    }
};

listEl.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');

    if (!button) {
        return;
    }

    const row = button.closest('tr');
    const booking = bookings.find(
        (item) => String(item.id) === row?.dataset.bookingId
    );

    if (!booking) {
        showFeedback('This booking is no longer in the list. Refresh and retry.', 'error');
        return;
    }

    if (button.dataset.action === 'edit') {
        clearFeedback();
        await openEditor(booking);
    } else if (button.dataset.action === 'delete') {
        await deleteBooking(booking, button);
    }
});

tripSelect.addEventListener('change', async () => {
    setEditorError('');

    try {
        await populateSchedules(tripSelect.value);
    } catch (error) {
        setEditorError(error.message);
    }
});

scheduleSelect.addEventListener('change', () => {
    const schedule = scheduleSelect.selectedOptions[0];
    if (!schedule) {
        populateTravelDays(null);
        return;
    }

    const selectedSchedule = activeSchedules.find(
        (item) => String(item.id) === schedule.value
    );
    populateTravelDays(selectedSchedule);
});

travelDaySelect.addEventListener('change', () => {
    populateTicketClasses(ticketClassSelect.value);
});

addPassengerButton.addEventListener('click', () => {
    if (passengerListEl.querySelectorAll('.booking-passenger').length < 8) {
        addPassenger();
    }
});

editorForm.addEventListener('submit', submitBookingUpdate);
cancelButton.addEventListener('click', closeEditor);
closeButton.addEventListener('click', closeEditor);
editorDialog.addEventListener('cancel', (event) => {
    if (isSaving) {
        event.preventDefault();
    }
});
refreshButton.addEventListener('click', loadBookings);
document.getElementById('bookings-retry')
    .addEventListener('click', loadBookings);
searchInput.addEventListener('input', filterBookings);

loadBookings();
