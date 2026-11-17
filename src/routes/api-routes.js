
import { Router } from 'express';
import { getAllTrips, getTripById } from '../controllers/trips.js';
import { getAllStations, getStationById } from '../controllers/stations.js';

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
 *               required:
 *                 - trips
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
 */
router.get('/trips', getAllTrips);

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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to fetch trip
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/trips/:id', getTripById);

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
