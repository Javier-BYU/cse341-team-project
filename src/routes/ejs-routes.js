import { bookingPage, processBookingRequest } from './book.js';
import confirmationPage from './confirm.js';
import { renderTripDetails, renderTripList } from '../controllers/trips.js';
import { Router } from 'express';

const router = Router();

router.get('/trips', renderTripList);
router.get('/trips/booking/:scheduleId', bookingPage);
router.post('/trips/book', processBookingRequest);
router.get('/trips/confirmation/:confirmationId', confirmationPage);
router.get('/trips/:tripId', renderTripDetails);

export default router;
