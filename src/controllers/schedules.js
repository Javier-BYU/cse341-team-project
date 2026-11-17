
import { getSchedulesByTripId, createSchedule as saveSchedule } from '../models/schedules.js';
import { getTripById } from '../models/trips.js';

// Retrieves all schedules for a trip.
export async function getSchedulesForTrip(req, res) {
    try {
        const schedules = await getSchedulesByTripId(req.params.tripId);

        if (schedules.length === 0) {
            return res.status(404).json({
                error: 'Schedules not found'
            });
        }

        return res.status(200).json(schedules);
    } catch (error) {
        console.error('Error fetching schedules:', error);

        return res.status(500).json({
            error: 'Failed to fetch schedules'
        });
    }
}

// Retrieves schedules for a trip filtered by month.
export async function getSchedulesForTripAndMonth(req, res) {
    const { month } = req.query;

    if (
        typeof month !== 'string' ||
        !/^(?:[1-9]|1[0-2])$/.test(month)
    ) {
        return res.status(400).json({
            error: 'Month must be a number from 1 to 12'
        });
    }

    try {
        const schedules = await getSchedulesByTripId(
            req.params.tripId,
            Number(month)
        );

        if (schedules.length === 0) {
            return res.status(404).json({
                error: 'Schedules not found'
            });
        }

        return res.status(200).json(schedules);
    } catch (error) {
        console.error('Error fetching schedules:', error);

        return res.status(500).json({
            error: 'Failed to fetch schedules'
        });
    }
}

// Creates a new schedule for an existing trip.
export async function createSchedule(req, res) {
    try {
        const {
            id,
            tripId,
            departureTime,
            arrivalTime,
            daysOfWeek,
            months,
            status
        } = req.body;

        // Validate required schedule information.
        if (
            id === undefined ||
            !Number.isInteger(Number(id)) ||
            Number(id) <= 0 ||
            typeof tripId !== 'string' ||
            !tripId.trim() ||
            typeof departureTime !== 'string' ||
            !departureTime.trim() ||
            typeof arrivalTime !== 'string' ||
            !arrivalTime.trim() ||
            !Array.isArray(daysOfWeek) ||
            daysOfWeek.length === 0 ||
            !Array.isArray(months) ||
            months.length === 0 ||
            typeof status !== 'boolean'
        ) {
            return res.status(400).json({
                error: 'Missing or invalid schedule information'
            });
        }

        // Validate operating days.
        const validDays = [
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday',
            'Sunday'
        ];

        const validDaysProvided = daysOfWeek.every(
            (day) => validDays.includes(day)
        );

        if (!validDaysProvided) {
            return res.status(400).json({
                error: 'Days of week must contain valid weekday names'
            });
        }

        // Validate operating months.
        const validMonths = months.every(
            (month) =>
                Number.isInteger(month) &&
                month >= 1 &&
                month <= 12
        );

        if (!validMonths) {
            return res.status(400).json({
                error: 'Months must contain numbers from 1 to 12'
            });
        }

        // Confirm that the associated trip exists.
        const trip = await getTripById(tripId.trim());

        if (!trip) {
            return res.status(404).json({
                error: 'Trip not found'
            });
        }

        const schedule = await saveSchedule({
            id: Number(id),
            tripId: tripId.trim(),
            departureTime: departureTime.trim(),
            arrivalTime: arrivalTime.trim(),
            daysOfWeek,
            months,
            status
        });

        return res.status(201).json({
            message: 'Schedule created successfully',
            schedule
        });
    } catch (error) {
        console.error('Error creating schedule:', error);

        if (error.code === 11000) {
            return res.status(409).json({
                error: 'A schedule with this ID already exists'
            });
        }

        if (error.name === 'ValidationError' || error.name === 'CastError') {
            return res.status(400).json({
                error: 'Invalid schedule information',
                details: error.message
            });
        }

        return res.status(500).json({
            error: 'Failed to create schedule'
        });
    }
}
