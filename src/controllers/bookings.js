
import { getDb } from '../db/connect.js';
import {
    getScheduleById
} from '../models/schedules.js';
import {
    getTripById
} from '../models/trips.js';
import {
    createBooking,
    getAllBookings as findAllBookings,
    getBookingById
} from '../models/bookings.js';
import { generateBookingReference } from '../includes/helpers.js';

const MAX_PASSENGERS = 8;

// Checks that every passenger has the required information.
const validatePassengers = (passengers) => {
    if (
        !Array.isArray(passengers) ||
        passengers.length === 0 ||
        passengers.length > MAX_PASSENGERS
    ) {
        return false;
    }

    return passengers.every((passenger) => {
        if (!passenger || typeof passenger !== 'object') {
            return false;
        }

        const {
            firstName,
            lastName,
            email,
            phone
        } = passenger;

        if (
            typeof firstName !== 'string' ||
            !firstName.trim() ||
            typeof lastName !== 'string' ||
            !lastName.trim() ||
            typeof email !== 'string' ||
            typeof phone !== 'string' ||
            !phone.trim()
        ) {
            return false;
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        return emailPattern.test(email.trim());
    });
};

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

        const trip = await getTripById(schedule.tripId);

        if (!trip) {
            const error = new Error('Trip not found');
            error.status = 404;
            return next(error);
        }

        const db = getDb();

        const ticketClasses = await db.collection('ticketClasses')
            .find({})
            .toArray();

        const ticketOptions = ticketClasses.map((ticketClass) => ({
            class: ticketClass.class,
            name: ticketClass.name,
            price: trip.distance * ticketClass.pricePerKm,
            amenities: ticketClass.amenities,
            description: ticketClass.description
        }));

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
        const {
            scheduleId,
            tripId,
            ticketClass,
            selectedDay,
            passengers
        } = req.body;

        // Validate required booking information.
        if (
            scheduleId === undefined ||
            !tripId ||
            !ticketClass ||
            !selectedDay ||
            !validatePassengers(passengers)
        ) {
            return res.status(400).send(
                'Missing or invalid booking information. A booking must contain between 1 and 8 passengers with valid details.'
            );
        }

        // Validate the schedule ID.
        const parsedScheduleId = Number(scheduleId);

        if (!Number.isInteger(parsedScheduleId) || parsedScheduleId <= 0) {
            return res.status(400).send('Invalid schedule ID.');
        }

        // Confirm that the submitted schedule exists.
        const schedule = await getScheduleById(parsedScheduleId);

        if (!schedule) {
            return res.status(404).send('Schedule not found.');
        }

        // Confirm that the schedule belongs to the submitted trip.
        if (String(schedule.tripId) !== String(tripId)) {
            return res.status(400).send(
                'The selected schedule does not belong to this trip.'
            );
        }

        // Confirm that the selected day is available for this schedule.
        if (
            !Array.isArray(schedule.daysOfWeek) ||
            !schedule.daysOfWeek.includes(selectedDay)
        ) {
            return res.status(400).send(
                'The selected day is not available for this schedule.'
            );
        }

        // Confirm that the associated trip exists.
        const trip = await getTripById(schedule.tripId);

        if (!trip) {
            return res.status(404).send('Trip not found.');
        }

        // Confirm that the selected ticket class exists.
        const db = getDb();

        const validTicketClass = await db.collection('ticketClasses')
            .findOne({ class: ticketClass });

        if (!validTicketClass) {
            return res.status(400).send(
                'Invalid ticket class selected.'
            );
        }

        // Create the booking using verified database values.
        const booking = {
            id: generateBookingReference(),
            scheduleId: parsedScheduleId,
            tripId: schedule.tripId,
            ticketClass: validTicketClass.class,
            selectedDay,
            passengers: passengers.map((passenger) => ({
                firstName: passenger.firstName.trim(),
                lastName: passenger.lastName.trim(),
                email: passenger.email.trim(),
                phone: passenger.phone.trim()
            }))
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

        // Validate required booking information.
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
            scheduleId: parsedScheduleId,
            tripId: schedule.tripId,
            ticketClass: validTicketClass.class,
            selectedDay,
            passengers: passengers.map((passenger) => ({
                firstName: passenger.firstName.trim(),
                lastName: passenger.lastName.trim(),
                email: passenger.email.trim(),
                phone: passenger.phone.trim()
            }))
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
    bookingsAdminPage
};
