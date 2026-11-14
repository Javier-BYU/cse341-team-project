import Trip from './schemas/trips.js';

const getAllTrips = async () => Trip.find({}).lean();

const getTripById = async (id) => Trip.findOne({ id }).lean();

export { getAllTrips, getTripById };
