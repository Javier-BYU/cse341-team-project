import { getDb } from '../db/connect.js';
import { getAllTrips as findAllTrips, getTripById as findTripById } from '../models/trips.js';

const getAllTrips = async (req, res) => {
    try {
        const trips = await findAllTrips();
        return res.status(200).json({ trips });
    } catch (error) {
        console.error('Error fetching trips:', error);
        return res.status(500).json({ error: 'Failed to fetch trips' });
    }
};

const getTripById = async (req, res) => {
    try {
        const trip = await findTripById(req.params.id);

        if (!trip) {
            return res.status(404).json({ error: 'Trip not found' });
        }

        return res.status(200).json(trip);
    } catch (error) {
        console.error('Error fetching trip:', error);
        return res.status(500).json({ error: 'Failed to fetch trip' });
    }
};

const renderTripList = (req, res) => {
    res.render('trips/list', { title: 'Scenic Train Trips' });
};

const renderTripDetails = async (req, res, next) => {
    try {
        const details = await findTripById(req.params.tripId);

        if (!details) {
            const error = new Error('Trip not found');
            error.status = 404;
            return next(error);
        }

        details.schedules = await getDb().collection('schedules').find({
            tripId: req.params.tripId
        }).toArray();

        return res.render('trips/details', {
            title: 'Trip Details',
            details
        });
    } catch (error) {
        return next(error);
    }
};

export { getAllTrips, getTripById, renderTripDetails, renderTripList };
