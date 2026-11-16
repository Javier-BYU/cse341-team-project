
import { Router } from 'express';
import {
    bookingPage,
    processBookingRequest,
    confirmationPage,
    bookingsAdminPage
} from '../controllers/bookings.js';
import {
    renderTripDetails,
    renderTripList
} from '../controllers/trips.js';

const router = Router();

// Trips pages
router.get('/trips', renderTripList);
router.get('/trips/:tripId', renderTripDetails);

// Booking pages
router.get('/trips/booking/:scheduleId', bookingPage);
router.post('/trips/book', processBookingRequest);
router.get('/trips/confirmation/:bookingId', confirmationPage);

// Bookings administration page
router.get('/bookings-admin', bookingsAdminPage);

export default router;
