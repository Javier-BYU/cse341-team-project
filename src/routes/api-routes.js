
import { Router } from 'express';
import {
    getAllTrips,
    getTripById,
    createTrip
} from '../controllers/trips.js';
import {
    getSchedulesForTrip,
    getSchedulesForTripAndMonth,
    createSchedule
} from '../controllers/schedules.js';
import {
    getAllBookings,
    createBookingApi
} from '../controllers/bookings.js';

const router = Router();

/**
 * @swagger
 * /api/trips:
 *   get:
 *     tags:
 *       - Trips
 *     summary: Get all scenic trips
 *     description: Returns every scenic train trip.
 *     responses:
 *       200:
 *         description: A list of trips
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 trips:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Trip'
 *       500:
 *         description: Failed to fetch trips
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *
 *   post:
 *     tags:
 *       - Trips
 *     summary: Add a new scenic train trip
 *     description: Creates and saves a new scenic train trip.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Trip'
 *           example:
 *             id: alpine-panorama
 *             name: Alpine Panorama Express
 *             description: A scenic railway journey through the Japanese Alps.
 *             region: Nagano
 *             startStation: Matsumoto
 *             endStation: Hakuba
 *             duration: 2 hours 30 minutes
 *             distance: 85.5
 *             highlights:
 *               - Mountain views
 *               - Alpine forests
 *             bestSeason: Spring and autumn
 *             operatingMonths: [4, 5, 6, 9, 10, 11]
 *             imageUrl: https://example.com/alpine-panorama.jpg
 *     responses:
 *       201:
 *         description: Trip created successfully
 *       400:
 *         description: Invalid trip information
 *       409:
 *         description: A trip with this ID already exists
 *       500:
 *         description: Failed to create trip
 */
router.get('/trips', getAllTrips);
router.post('/trips', createTrip);

/**
 * @swagger
 * /api/trips/{id}:
 *   get:
 *     tags:
 *       - Trips
 *     summary: Get a scenic trip by ID
 *     description: Returns one scenic train trip by its identifier.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: The requested trip
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Trip'
 *       404:
 *         description: Trip not found
 *       500:
 *         description: Failed to fetch trip
 */
router.get('/trips/:id', getTripById);

/**
 * @swagger
 * /api/trips/{id}/schedules:
 *   get:
 *     tags:
 *       - Schedules
 *     summary: Get schedules for a trip
 *     description: Returns all schedules for a trip, optionally filtered by month.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: month
 *         required: false
 *         description: Calendar month number, from 1 to 12
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *     responses:
 *       200:
 *         description: Matching trip schedules
 *       400:
 *         description: Invalid month
 *       404:
 *         description: No schedules found
 *       500:
 *         description: Server error
 */
router.get('/trips/:tripId/schedules', (req, res) => {
    if (req.query.month !== undefined) {
        return getSchedulesForTripAndMonth(req, res);
    }

    return getSchedulesForTrip(req, res);
});

/**
 * @swagger
 * /api/schedules:
 *   post:
 *     tags:
 *       - Schedules
 *     summary: Create a train schedule
 *     description: Creates a new schedule for an existing scenic trip.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Schedule'
 *           example:
 *             id: 101
 *             tripId: alpine-panorama
 *             departureTime: "09:00"
 *             arrivalTime: "11:30"
 *             daysOfWeek:
 *               - Monday
 *               - Wednesday
 *               - Friday
 *             months: [4, 5, 6, 9, 10, 11]
 *             status: true
 *     responses:
 *       201:
 *         description: Schedule created successfully
 *       400:
 *         description: Invalid schedule information
 *       404:
 *         description: Trip not found
 *       409:
 *         description: A schedule with this ID already exists
 *       500:
 *         description: Failed to create schedule
 */
router.post('/schedules', createSchedule);

/**
 * @swagger
 * /api/bookings:
 *   get:
 *     tags:
 *       - Bookings
 *     summary: Get all bookings
 *     description: Returns all saved train bookings and their passenger details.
 *     responses:
 *       200:
 *         description: A list of bookings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 bookings:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Booking'
 *       500:
 *         description: Failed to fetch bookings
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *
 *   post:
 *     tags:
 *       - Bookings
 *     summary: Create a new booking
 *     description: Creates and saves a train booking with passenger information.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateBooking'
 *           example:
 *             scheduleId: 101
 *             tripId: alpine-panorama
 *             ticketClass: First Class
 *             selectedDay: Monday
 *             passengers:
 *               - firstName: John
 *                 lastName: Smith
 *                 email: john@example.com
 *                 phone: "+819012345678"
 *     responses:
 *       201:
 *         description: Booking created successfully
 *       400:
 *         description: Missing or invalid booking information
 *       404:
 *         description: Schedule or trip not found
 *       500:
 *         description: Failed to create booking
 */
router.get('/bookings', getAllBookings);
router.post('/bookings', createBookingApi);

export default router;
