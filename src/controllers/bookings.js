
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

        // Ticket classes still use the existing native MongoDB collection.
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
        const booking = {
            id: generateBookingReference(),
            scheduleId: Number(req.body.scheduleId),
            tripId: req.body.tripId,
            ticketClass: req.body.ticketClass,
            selectedDay: req.body.selectedDay,
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
    confirmationPage,
    getAllBookings,
    bookingsAdminPage
};
