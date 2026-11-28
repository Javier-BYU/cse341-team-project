
import {
    getAllTicketClasses,
    getTicketClassesForDay,
} from '../models/ticket-classes.js';
import {
    getScheduleById
} from '../models/schedules.js';
import {
    getTripById
} from '../models/trips.js';
import {
    createBooking,
    getAllBookings as findAllBookings,
    getBookingsByPassengerEmail as findBookingsByPassengerEmail,
    getBookingById,
    updateBooking as saveBookingUpdates,
    deleteBooking as removeBooking
} from '../models/bookings.js';
import { generateBookingReference } from '../includes/helpers.js';
import { getDb } from '../db/connect.js';

const validWeekdays = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday'
];

const isScheduleActive = (schedule) => schedule?.status === true;

const validatePassengers = (passengers) => {
    const passengerFields = ['firstName', 'lastName', 'email', 'phone'];

    return Array.isArray(passengers) &&
        passengers.length >= 1 &&
        passengers.length <= 8 &&
        passengers.every((passenger) => (
            passenger &&
            typeof passenger === 'object' &&
            !Array.isArray(passenger) &&
            Object.keys(passenger).length === passengerFields.length &&
            passengerFields.every((field) => (
                typeof passenger[field] === 'string' &&
                passenger[field].trim()
            )) &&
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(passenger.email.trim())
        ));
};

const validateBookingUpdate = async (body) => {
    const editableFields = [
        'scheduleId',
        'tripId',
        'ticketClass',
        'selectedDay',
        'passengers'
    ];

    if (
        !body ||
        typeof body !== 'object' ||
        Array.isArray(body) ||
        Object.keys(body).length !== editableFields.length ||
        Object.keys(body).some((field) => !editableFields.includes(field))
    ) {
        return { error: 'Provide only all editable booking fields.' };
    }

    if (
        !Number.isInteger(body.scheduleId) ||
        body.scheduleId <= 0 ||
        typeof body.tripId !== 'string' ||
        !body.tripId.trim() ||
        !validatePassengers(body.passengers)
    ) {
        return { error: 'Invalid booking information.' };
    }

    const ticketValidation = await validateTicketClassAvailability(
        body.selectedDay,
        body.ticketClass
    );

    if (ticketValidation.error) {
        return { error: ticketValidation.error };
    }

    const schedule = await getScheduleById(body.scheduleId);

    if (
        !schedule ||
        !isScheduleActive(schedule) ||
        String(schedule.tripId) !== body.tripId.trim() ||
        !Array.isArray(schedule.daysOfWeek) ||
        !schedule.daysOfWeek.some(
            (day) => day.toLowerCase() === ticketValidation.selectedDay
        )
    ) {
        return { error: 'The selected schedule, trip, or travel day is invalid.' };
    }

    const trip = await getTripById(schedule.tripId);

    if (!trip) {
        return { error: 'The selected trip does not exist.' };
    }

    return {
        booking: {
            scheduleId: schedule.id,
            tripId: schedule.tripId,
            ticketClass: ticketValidation.ticketClass,
            selectedDay: ticketValidation.selectedDay,
            passengers: body.passengers.map((passenger) => ({
                firstName: passenger.firstName.trim(),
                lastName: passenger.lastName.trim(),
                email: passenger.email.trim(),
                phone: passenger.phone.trim()
            }))
        }
    };
};

const bookingHasPassengerEmail = (booking, email) => {
    const normalizedEmail = email.trim().toLowerCase();

    return booking.passengers.some(
        (passenger) => passenger.email.trim().toLowerCase() === normalizedEmail
    );
};

const validateTicketClassAvailability = async (selectedDay, ticketClass) => {
    if (typeof selectedDay !== 'string') {
        return { error: 'Please select a valid travel day.' };
    }

    const normalizedDay = selectedDay.trim().toLowerCase();
    if (!validWeekdays.includes(normalizedDay)) {
        return { error: 'Please select a valid travel day.' };
    }

    if (typeof ticketClass !== 'string' || !ticketClass.trim()) {
        return { error: 'Please select a valid ticket class.' };
    }

    const normalizedTicketClass = ticketClass.trim().toLowerCase();
    const availableTicketClasses = await getTicketClassesForDay(normalizedDay);
    const matchingTicketClass = availableTicketClasses.find(
        (availableClass) => availableClass.class === normalizedTicketClass
    );

    if (!matchingTicketClass) {
        return {
            error: 'The selected ticket class is unavailable on that day. Please choose another option.'
        };
    }

    return {
        selectedDay: normalizedDay,
        ticketClass: matchingTicketClass.class
    };
};

const buildTicketOptions = (ticketClasses, trip) => ticketClasses.map((ticketClass) => ({
    class: ticketClass.class,
    name: ticketClass.name,
    price: trip.distance * ticketClass.pricePerKm,
    amenities: ticketClass.amenities,
    description: ticketClass.description
}));


// Displays the booking form for a selected train schedule.
const bookingPage = async (req, res, next) => {
    try {
        const { scheduleId } = req.params;

        const schedule = await getScheduleById(scheduleId);

        if (!schedule) {
            const error = new Error('Schedule not found');
            error.status = 404;
            return next(error);
        }

        // Prevent customers from opening inactive schedules.
        if (!isScheduleActive(schedule)) {
            const error = new Error('Schedule is not available for booking');
            error.status = 404;
            return next(error);
        }

        const trip = await getTripById(schedule.tripId);

        if (!trip) {
            const error = new Error('Trip not found');
            error.status = 404;
            return next(error);
        }

        const ticketClasses = await getAllTicketClasses();

        const ticketOptions = buildTicketOptions(ticketClasses, trip);

        return res.render('trips/book', {
            title: 'Book Trip',
            schedule,
            ticketOptions
        });
    } catch (error) {
        return next(error);
    }
};


// Processes the submitted booking form and saves the booking.
const processBookingRequest = async (req, res, next) => {
    try {
        const validation = await validateTicketClassAvailability(
            req.body.selectedDay,
            req.body.ticketClass
        );

        if (validation.error) {
            const scheduleId = req.body.scheduleId;
            const schedule = await getScheduleById(scheduleId);

            if (!schedule) {
                const error = new Error('Schedule not found');
                error.status = 404;
                return next(error);
            }

            const trip = await getTripById(schedule.tripId);

            if (!trip) {
                const error = new Error('Trip not found');
                error.status = 404;
                return next(error);
            }

            const ticketClasses = await getAllTicketClasses();
            const ticketOptions = buildTicketOptions(ticketClasses, trip);

            return res.status(400).render('trips/book', {
                title: 'Book Trip',
                schedule,
                ticketOptions,
                validationMessage: validation.error,
                submittedDay: typeof req.body.selectedDay === 'string'
                    ? req.body.selectedDay.trim().toLowerCase()
                    : '',
                submittedTicketClass: typeof req.body.ticketClass === 'string'
                    ? req.body.ticketClass.trim().toLowerCase()
                    : ''
            });
        }

        const booking = {
            id: generateBookingReference(),
            scheduleId: Number(req.body.scheduleId),
            tripId: req.body.tripId,
            ticketClass: validation.ticketClass,
            selectedDay: validation.selectedDay,
            passengers: req.body.passengers
        };

        await createBooking(booking);

        return res.redirect(
            `/trips/confirmation/${booking.id}`
        );
    } catch (error) {
        return next(error);
    }
};

// Creates a booking through the API.
const createBookingApi = async (req, res) => {
    try {
        const {
            scheduleId,
            tripId,
            ticketClass,
            selectedDay,
            passengers
        } = req.body;

        const validation = await validateTicketClassAvailability(
            selectedDay,
            ticketClass
        );

        if (validation.error) {
            return res.status(400).json({
                error: validation.error
            });
        }

        if (
            scheduleId === undefined ||
            !tripId ||
            !ticketClass ||
            !selectedDay ||
            !validatePassengers(passengers)
        ) {
            return res.status(400).json({
                error: 'Missing or invalid booking information. A booking must contain between 1 and 8 passengers with valid details.'
            });
        }

        // Validate the schedule ID.
        const parsedScheduleId = Number(scheduleId);

        if (!Number.isInteger(parsedScheduleId) || parsedScheduleId <= 0) {
            return res.status(400).json({
                error: 'Invalid schedule ID'
            });
        }

        // Confirm that the submitted schedule exists.
        const schedule = await getScheduleById(parsedScheduleId);

        if (!schedule) {
            return res.status(404).json({
                error: 'Schedule not found'
            });
        }

        // Prevent booking an inactive schedule.
        if (!isScheduleActive(schedule)) {
            return res.status(409).json({
                error: 'This schedule is no longer available for booking'
            });
        }

        // Confirm that the schedule belongs to the submitted trip.
        if (String(schedule.tripId) !== String(tripId)) {
            return res.status(400).json({
                error: 'The selected schedule does not belong to this trip'
            });
        }

        // Confirm that the selected day is available for this schedule.
        if (
            !Array.isArray(schedule.daysOfWeek) ||
            !schedule.daysOfWeek.some(
                (day) => day.toLowerCase() === validation.selectedDay
            )
        ) {
            return res.status(400).json({
                error: 'The selected day is not available for this schedule'
            });
        }

        // Confirm that the associated trip exists.
        const trip = await getTripById(schedule.tripId);

        if (!trip) {
            return res.status(404).json({
                error: 'Trip not found'
            });
        }

        // Confirm that the selected ticket class exists.
        const db = getDb();

        const validTicketClass = await db.collection('ticketClasses')
            .findOne({ class: validation.ticketClass });

        if (!validTicketClass) {
            return res.status(400).json({
                error: 'Invalid ticket class selected'
            });
        }

        // Create the booking using verified database values.
        const booking = {
            id: generateBookingReference(),
            scheduleId: schedule.id,
            tripId: schedule.tripId,
            ticketClass: validation.ticketClass,
            selectedDay: validation.selectedDay,
            passengers
        };

        await createBooking(booking);

        return res.status(201).json({
            message: 'Booking created successfully',
            booking
        });
    } catch (error) {
        console.error('Error creating booking:', error);

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                error: 'Invalid booking information',
                details: error.message
            });
        }

        return res.status(500).json({
            error: 'Failed to create booking'
        });
    }
};

// Displays the saved booking details.
const confirmationPage = async (req, res, next) => {
    try {
        const { bookingId } = req.params;

        const booking = await getBookingById(bookingId);

        if (!booking) {
            const error = new Error('Booking not found');
            error.status = 404;
            return next(error);
        }

        return res.render('trips/confirm', {
            title: 'Trip Confirmation',
            booking
        });
    } catch (error) {
        return next(error);
    }
};

// Returns all bookings to administrators and only matching bookings to users.
const getAllBookings = async (req, res) => {
    try {
        const isAdmin = req.session.user.role === 'admin';
        const email = req.session.user.email;

        if (!isAdmin && (typeof email !== 'string' || !email.trim())) {
            return res.status(403).json({ error: 'Booking access is forbidden.' });
        }

        const bookings = isAdmin
            ? await findAllBookings()
            : await findBookingsByPassengerEmail(email);

        return res.status(200).json({ bookings });
    } catch (error) {
        console.error('Error fetching bookings:', error);

        return res.status(500).json({
            error: 'Failed to fetch bookings'
        });
    }
};

const updateBookingApi = async (req, res) => {
    try {
        const id = req.params.id;
        const isAdmin = req.session.user.role === 'admin';
        const ownerEmail = isAdmin ? null : req.session.user.email;
        const existingBooking = await getBookingById(id);

        if (!existingBooking) {
            return res.status(404).json({ error: 'Booking not found.' });
        }

        if (!isAdmin && (
            typeof ownerEmail !== 'string' ||
            !bookingHasPassengerEmail(existingBooking, ownerEmail)
        )) {
            return res.status(403).json({ error: 'You cannot modify this booking.' });
        }

        const validation = await validateBookingUpdate(req.body);

        if (validation.error) {
            return res.status(400).json({ error: validation.error });
        }

        const booking = await saveBookingUpdates(
            id,
            validation.booking,
            ownerEmail
        );

        if (!booking) {
            const currentBooking = await getBookingById(id);

            if (!currentBooking) {
                return res.status(404).json({ error: 'Booking not found.' });
            }

            return res.status(403).json({ error: 'You cannot modify this booking.' });
        }

        return res.status(200).json({
            message: 'Booking updated successfully.',
            booking
        });
    } catch (error) {
        console.error('Error updating booking:', error);

        if (error.name === 'ValidationError' || error.name === 'CastError') {
            return res.status(400).json({
                error: 'Invalid booking information.',
                details: error.message
            });
        }

        return res.status(500).json({ error: 'Failed to update booking.' });
    }
};

const deleteBookingApi = async (req, res) => {
    try {
        const id = req.params.id;
        const isAdmin = req.session.user.role === 'admin';
        const ownerEmail = isAdmin ? null : req.session.user.email;
        const existingBooking = await getBookingById(id);

        if (!existingBooking) {
            return res.status(404).json({ error: 'Booking not found.' });
        }

        if (!isAdmin && (
            typeof ownerEmail !== 'string' ||
            !bookingHasPassengerEmail(existingBooking, ownerEmail)
        )) {
            return res.status(403).json({ error: 'You cannot modify this booking.' });
        }

        const booking = await removeBooking(id, ownerEmail);

        if (!booking) {
            const currentBooking = await getBookingById(id);

            if (!currentBooking) {
                return res.status(404).json({ error: 'Booking not found.' });
            }

            return res.status(403).json({ error: 'You cannot modify this booking.' });
        }

        return res.status(200).json({
            message: 'Booking deleted successfully.',
            booking
        });
    } catch (error) {
        console.error('Error deleting booking:', error);

        return res.status(500).json({ error: 'Failed to delete booking.' });
    }
};

// Returns bookings that include the signed-in user as a passenger.
const getMyBookings = async (req, res) => {
    try {
        const email = req.session.user.email;

        if (typeof email !== 'string' || !email.trim()) {
            return res.status(403).json({ error: 'Booking access is forbidden.' });
        }

        const bookings = await findBookingsByPassengerEmail(email);
        const userBookings = bookings.map((booking) => ({
            id: booking.id,
            tripId: booking.tripId,
            ticketClass: booking.ticketClass,
            selectedDay: booking.selectedDay,
            createdAt: booking.createdAt,
            passengerCount: booking.passengers.length
        }));

        return res.status(200).json({ bookings: userBookings });
    } catch (error) {
        console.error('Error fetching user bookings:', error);

        return res.status(500).json({
            error: 'Failed to fetch user bookings'
        });
    }
};

// Displays the bookings administration page.
const bookingsAdminPage = (req, res) => {
    return res.render('bookings', {
        title: 'Bookings Administration'
    });
};

export {
    bookingPage,
    processBookingRequest,
    createBookingApi,
    confirmationPage,
    getAllBookings,
    updateBookingApi,
    deleteBookingApi,
    getMyBookings,
    bookingsAdminPage
};
