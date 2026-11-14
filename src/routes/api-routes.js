import { Router } from 'express';
import {
  getSchedulesForTrip,
  getSchedulesForTripAndMonth,
} from '../controllers/schedules.js';

const router = Router();

/**
 * @swagger
 * /api/trips/{id}/schedules:
 *   get:
 *     summary: Get schedules for a trip, optionally filtered by month
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
 *       '200':
 *         description: Matching trip schedules
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   tripId:
 *                     type: string
 *                   departureTime:
 *                     type: string
 *                   arrivalTime:
 *                     type: string
 *                   daysOfWeek:
 *                     type: array
 *                     items:
 *                       type: string
 *                   months:
 *                     type: array
 *                     items:
 *                       type: integer
 *                   status:
 *                     type: boolean
 *       '400':
 *         description: Invalid month
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       '404':
 *         description: No schedules found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       '500':
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.get('/trips/:tripId/schedules', (req, res) => {
  if (req.query.month !== undefined) {
    return getSchedulesForTripAndMonth(req, res);
  }

  return getSchedulesForTrip(req, res);
});

export default router;
