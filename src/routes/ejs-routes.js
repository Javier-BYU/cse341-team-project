
import { Router } from 'express';
import {
    bookingPage,
    processBookingRequest,
    confirmationPage,
    bookingsAdminPage
} from '../controllers/bookings.js';

import {
    renderTripDetails,
    renderTripList,
    renderTripAdminPage
} from '../controllers/trips.js';

import {
    adminPage,
    loginPage,
    loginUser,
    logoutUser,
    registerPage,
    registerUser
} from '../controllers/auth.js';

import { userDashboardPage } from '../controllers/dashboard.js';
import { usersAdminPage } from '../controllers/user-admin.js';
import { requirePageLogin, requirePageRole } from '../middleware/auth.js';

const router = Router();

// Authentication pages
router.get('/register', registerPage);
router.post('/register', registerUser);
router.get('/login', loginPage);
router.post('/login', loginUser);
router.get('/logout', logoutUser);
router.post('/logout', logoutUser);

// Dashboard pages
router.get('/admin', requirePageRole('admin'), adminPage);
router.get('/trips-admin', requirePageRole('admin'), renderTripAdminPage);
router.get('/dashboard', requirePageLogin, userDashboardPage);

// Protected user management page
router.get('/admin/users', requirePageLogin, usersAdminPage);

// Access denied page
router.get('/403', (req, res) => res.status(403).render('errors/403', {
    title: 'Forbidden'
}));

// Trips pages
router.get('/trips', renderTripList);
router.get('/trips/:tripId', renderTripDetails);

// Booking pages
router.get('/trips/booking/:scheduleId', bookingPage);
router.post('/trips/book', processBookingRequest);
router.get('/trips/confirmation/:bookingId', confirmationPage);

// Bookings administration page
router.get('/bookings-admin', requirePageLogin, bookingsAdminPage);

export default router;
