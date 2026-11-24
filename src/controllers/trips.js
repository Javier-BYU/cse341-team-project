
import {
    getAllTrips as findAllTrips,
    getTripById as findTripById,
    createTrip as saveTrip
} from '../models/trips.js';

import {
    getSchedulesByTripId
} from '../models/schedules.js';

const parsePositiveInteger = (value, defaultValue) => {
    if (value === undefined) {
        return defaultValue;
    }

    if (typeof value !== 'string' || !/^\d+$/.test(value)) {
        return null;
    }

    const parsedValue = Number(value);

    return Number.isSafeInteger(parsedValue) && parsedValue > 0
        ? parsedValue
        : null;
};

const getAllTrips = async (req, res) => {
    const page = parsePositiveInteger(req.query.page, 1);
    const limit = parsePositiveInteger(req.query.limit, 10);

    if (page === null || limit === null) {
        return res.status(400).json({
            error: 'page and limit must be positive integers'
        });
    }

    try {
        const { trips, total } = await findAllTrips(page, limit);
        const totalPages = Math.max(1, Math.ceil(total / limit));

        return res.status(200).json({
            trips,
            page,
            limit,
            total,
            totalPages
        });
    } catch (error) {
        console.error('Error fetching trips:', error);

        return res.status(500).json({
            error: 'Failed to fetch trips'
        });
    }
};

// Retrieves only trips that have at least one active schedule.
const getAvailableTrips = async (req, res) => {
    try {
        const { trips } = await findAllTrips(1, 1000);

        const availabilityChecks = await Promise.all(
            trips.map(async (trip) => {
                const schedules = await getSchedulesByTripId(trip.id);

                return schedules.length > 0 ? trip : null;
            })
        );

        const availableTrips = availabilityChecks.filter(Boolean);

        return res.status(200).json({
            trips: availableTrips
        });
    } catch (error) {
        console.error('Error fetching available trips:', error);

        return res.status(500).json({
            error: 'Failed to fetch available trips'
        });
    }
};

const getTripById = async (req, res) => {
    try {
        const trip = await findTripById(req.params.id);

        if (!trip) {
            return res.status(404).json({
                error: 'Trip not found'
            });
        }

        return res.status(200).json(trip);
    } catch (error) {
        console.error('Error fetching trip:', error);

        return res.status(500).json({
            error: 'Failed to fetch trip'
        });
    }
};

// Creates a new scenic train trip.
const createTrip = async (req, res) => {
    try {
        const trip = await saveTrip(req.body);

        return res.status(201).json({
            message: 'Trip created successfully',
            trip
        });
    } catch (error) {
        console.error('Error creating trip:', error);

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                error: 'Invalid trip information',
                details: error.message
            });
        }

        if (error.code === 11000) {
            return res.status(409).json({
                error: 'A trip with this ID already exists'
            });
        }

        return res.status(500).json({
            error: 'Failed to create trip'
        });
    }
};

const renderTripList = (req, res) => {
    res.render('trips/list', {
        title: 'Scenic Train Trips'
    });
};

const renderTripDetails = async (req, res, next) => {
    try {
        const details = await findTripById(req.params.tripId);

        if (!details) {
            const error = new Error('Trip not found');
            error.status = 404;

            return next(error);
        }

        return res.render('trips/details', {
            title: 'Trip Details',
            details
        });
    } catch (error) {
        return next(error);
    }
};

export {
    getAllTrips,
    getAvailableTrips,
    getTripById,
    createTrip,
    renderTripDetails,
    renderTripList
};
