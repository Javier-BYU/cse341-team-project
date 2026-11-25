
import Schedule from './schemas/schedules.js';

// Retrieves schedules for a trip, optionally filtered by month.
const getSchedulesByTripId = async (tripId, month) => {
    const query = { tripId };

    if (month !== undefined) {
        query.months = month;
    }

    return Schedule.find(query).lean();
};

// Retrieves one schedule using its numeric ID.
const getScheduleById = async (id) => {
    return Schedule.findOne({ id: Number(id) }).lean();
};

// Retrieves all existing train schedules.
const getAllSchedules = async () => Schedule.find({}).lean();

// Creates and saves a new train schedule.
const createSchedule = async (scheduleData) => {
    return Schedule.create(scheduleData);
};


// Reassigns an existing schedule to another trip.
const updateScheduleTrip = async (id, tripId) =>
    Schedule.findOneAndUpdate(
        { id: Number(id) },
        { $set: { tripId } },
        { new: true, runValidators: true }
    ).lean();


export {
    getScheduleById,
    getSchedulesByTripId,
    getAllSchedules,
    createSchedule,
    updateScheduleTrip
};