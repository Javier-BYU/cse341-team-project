
import Trip from './schemas/trips.js';

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getAllTrips = async (page = 1, limit = 10, filters = {}) => {
    const query = {};

    if (filters.region) {
        query.region = filters.region;
    }

    if (filters.season) {
        query.bestSeason = filters.season;
    }

    if (filters.search) {
        const searchPattern = new RegExp(escapeRegex(filters.search), 'i');
        query.$or = [
            { name: searchPattern },
            { description: searchPattern }
        ];
    }

    const [trips, total] = await Promise.all([
        Trip.find(query)
            .sort({ id: 1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        Trip.countDocuments(query)
    ]);

    return { trips, total };
};

const getTripById = async (id) => Trip.findOne({ id }).lean();

const createTrip = async (tripData) => Trip.create(tripData);

// Updates an existing trip using its ID.
const updateTrip = async (id, tripData) =>
    Trip.findOneAndUpdate(
        { id },
        { $set: tripData },
        { new: true, runValidators: true }
    ).lean();

// Deletes an existing trip using its ID.
const deleteTrip = async (id) =>
    Trip.findOneAndDelete({ id }).lean();

export {
    getAllTrips,
    getTripById,
    createTrip,
    updateTrip,
    deleteTrip
};
