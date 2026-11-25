
import Trip from './schemas/trips.js';

const getAllTrips = async (page = 1, limit = 10) => {
    const [trips, total] = await Promise.all([
        Trip.find({})
            .sort({ id: 1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        Trip.countDocuments({})
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
