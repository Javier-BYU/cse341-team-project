import { getSchedulesByTripId } from '../models/schedules.js';

export async function getSchedulesForTrip(req, res) {
  try {
    const schedules = await getSchedulesByTripId(req.params.tripId);

    if (schedules.length === 0) {
      return res.status(404).json({ error: 'Schedules not found' });
    }

    return res.status(200).json(schedules);
  } catch (error) {
    console.error('Error fetching schedules:', error);
    return res.status(500).json({ error: 'Failed to fetch schedules' });
  }
}

export async function getSchedulesForTripAndMonth(req, res) {
  const { month } = req.query;
  if (typeof month !== 'string' || !/^(?:[1-9]|1[0-2])$/.test(month)) {
    return res.status(400).json({ error: 'Month must be a number from 1 to 12' });
  }

  try {
    const schedules = await getSchedulesByTripId(req.params.tripId, Number(month));

    if (schedules.length === 0) {
      return res.status(404).json({ error: 'Schedules not found' });
    }

    return res.status(200).json(schedules);
  } catch (error) {
    console.error('Error fetching schedules:', error);
    return res.status(500).json({ error: 'Failed to fetch schedules' });
  }
}
