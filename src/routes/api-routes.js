import { Router } from 'express';

import {
    getAllTrips,
    getTripById,
    createTrip,
    updateTrip,
    deleteTrip,
    getAvailableTrips
} from '../controllers/trips.js';

import {
    getAllStations,
    getStationById
} from '../controllers/stations.js';

import {
    getSchedulesForTrip,
    getSchedulesForTripAndMonth,
    getAllSchedulesController,
    createSchedule,
    updateScheduleTripController
} from '../controllers/schedules.js';

import {
    getAllBookings,
    createBookingApi,
    getMyBookings
} from '../controllers/bookings.js';

import {
    getAllTicketClasses,
    getTicketClassesForDay
} from '../controllers/ticket-classes.js';
import { requireApiLogin } from '../middleware/auth.js';
import usersRoutes from './users.js';

import {
    requireApiLogin,
    requireApiRole
} from '../middleware/auth.js';

const router = Router();

router.use('/users', usersRoutes);

/**
 * @swagger
 * /api/trips:
 *   get:
 *     tags:
 *       - Trips
 *     summary: Get a paginated list of scenic trips
 *     description: Returns a page of scenic train trips.
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         description: Page number (defaults to 1)
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         required: false
 *         description: Number of trips per page (defaults to 10)
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 10
 *       - in: query
 *         name: region
 *         required: false
 *         description: Exact region to filter by
 *         schema:
 *           type: string
 *         example: central
 *       - in: query
 *         name: season
 *         required: false
 *         description: Exact best season to filter by
 *         schema:
 *           type: string
 *         example: autumn
 *       - in: query
 *         name: search
 *         required: false
 *         description: Case-insensitive literal search across trip names and descriptions
 *         schema:
 *           type: string
 *         example: mountain
 *     responses:
 *       200:
 *         description: A page of trips and pagination metadata
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 trips:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Trip'
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 10
 *                 total:
 *                   type: integer
 *                   example: 24
 *                 totalPages:
 *                   type: integer
 *                   example: 3
 *       400:
 *         description: Page and limit must be positive integers
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 * /api/trips/available:
 *   get:
 *     tags:
 *       - Trips
 *     summary: Get trips available for booking
 *     description: Returns scenic trips that have at least one active schedule.
 *     responses:
 *       200:
 *         description: A list of trips with active schedules
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
 *         description: Failed to fetch available trips
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/trips/available', getAvailableTrips);

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
 *
 *   put:
 *     tags:
 *       - Trips
 *     summary: Update a scenic trip
 *     description: Updates an existing trip. Admin access required.
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Trip'
 *     responses:
 *       200:
 *         description: Trip updated successfully
 *       400:
 *         description: Invalid trip information
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Trip not found
 *       500:
 *         description: Failed to update trip
 *
 *   delete:
 *     tags:
 *       - Trips
 *     summary: Delete a scenic trip
 *     description: Deletes an existing trip. Admin access required.
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trip deleted successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Trip not found
 *       500:
 *         description: Failed to delete trip
 */

router.get('/trips/:id', getTripById);

router.put('/trips/:id', requireApiRole('admin'), updateTrip);
router.delete('/trips/:id', requireApiRole('admin'), deleteTrip);


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


/**
 * @swagger
 * /api/schedules:
 *   get:
 *     tags:
 *       - Schedules
 *     summary: Get all existing schedules
 *     description: Returns every train schedule.
 *     responses:
 *       200:
 *         description: A list of schedules
 *       500:
 *         description: Failed to fetch schedules
 */

router.get('/schedules', getAllSchedulesController);
router.post('/schedules', createSchedule);

router.get('/schedules', getAllSchedulesController);
router.post('/schedules', createSchedule);

router.put(
    '/schedules/:id',
    requireApiRole('admin'),
    updateScheduleTripController
);

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
 *
 * /api/bookings/mine:
 *   get:
 *     tags:
 *       - Bookings
 *     summary: Get the signed-in user's bookings
 *     description: Returns bookings that list the signed-in user's email as a passenger.
 *     responses:
 *       200:
 *         description: The user's bookings
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Failed to fetch user bookings
 */
router.get('/bookings/mine', requireApiLogin, getMyBookings);
router.get('/bookings', getAllBookings);
router.post('/bookings', createBookingApi);

/**
 * @swagger
 * /api/stations:
 *   get:
 *     tags:
 *       - Stations
 *     summary: Get all stations
 *     description: Returns every train station.
 *     responses:
 *       200:
 *         description: A list of stations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stations:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       prefecture:
 *                         type: string
 *                       region:
 *                         type: string
 *                       facilities:
 *                         type: array
 *                         items:
 *                           type: string
 *                       description:
 *                         type: string
 *       500:
 *         description: Failed to fetch stations
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/stations', getAllStations);

/**
 * @swagger
 * /api/stations/{id}:
 *   get:
 *     tags:
 *       - Stations
 *     summary: Get a station by ID
 *     description: Returns one station by its identifier.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: The requested station
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 prefecture:
 *                   type: string
 *                 region:
 *                   type: string
 *                 facilities:
 *                   type: array
 *                   items:
 *                     type: string
 *                 description:
 *                   type: string
 *       404:
 *         description: Station not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to fetch station
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/stations/:id', getStationById);

export default router;
