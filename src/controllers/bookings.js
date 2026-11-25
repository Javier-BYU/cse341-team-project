
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
    getBookingById
} from '../models/bookings.js';
import { generateBookingReference } from '../includes/helpers.js';

const validWeekdays = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday'
];

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
            !schedule.daysOfWeek.includes(selectedDay)
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
            .findOne({ class: ticketClass });

        if (!validTicketClass) {
            return res.status(400).json({
                error: 'Invalid ticket class selected'
            });
        }

        // Create the booking using verified database values.
        const booking = {
            id: generateBookingReference(),
            scheduleId: Number(scheduleId),
            tripId,
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

// Returns all bookings through the API.
const getAllBookings = async (req, res) => {
    try {
        const bookings = await findAllBookings();

        return res.status(200).json({ bookings });
    } catch (error) {
        console.error('Error fetching bookings:', error);

        return res.status(500).json({
            error: 'Failed to fetch bookings'
        });
    }
};

// Returns bookings that include the signed-in user as a passenger.
const getMyBookings = async (req, res) => {
    try {
        const bookings = await findBookingsByPassengerEmail(req.session.user.email);
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
    getMyBookings,
    bookingsAdminPage
};
