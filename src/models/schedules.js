
import Schedule from './schemas/schedules.js';

const getSchedulesByTripId = async (tripId, month) => {
    const query = { tripId };

    if (month !== undefined) {
        query.months = month;
    }

    return Schedule.find(query).lean();
};

const getScheduleById = async (id) => {
    return Schedule.findOne({ id: Number(id) }).lean();
};

export { getScheduleById, getSchedulesByTripId };
