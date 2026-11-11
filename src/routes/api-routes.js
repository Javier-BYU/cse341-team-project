import { getAllTrips, getTripById } from '../controllers/trips.js';
import { Router } from 'express';

const router = Router();

/**
 * @swagger
 * /api/trips:
 *   get:
 *     summary: Get all scenic trips
 *     responses:
 *       200:
 *         description: A list of trips
 *       500:
 *         description: Failed to fetch trips
 */
router.get('/trips', getAllTrips);

/**
 * @swagger
 * /api/trips/{id}:
 *   get:
 *     summary: Get a scenic trip by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: The requested trip
 *       404:
 *         description: Trip not found
 *       500:
 *         description: Failed to fetch trip
 */
router.get('/trips/:id', getTripById);

export default router;
