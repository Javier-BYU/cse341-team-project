
import Station from './schemas/stations.js';

const getAllStations = async () => Station.find({}).lean();

const getStationById = async (id) => Station.findOne({ id }).lean();

export { getAllStations, getStationById };
