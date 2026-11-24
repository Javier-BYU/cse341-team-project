
import {
  getAllTicketClasses as findAllTicketClasses,
  getTicketClassesForDay as findTicketClassesForDay,
} from '../models/ticket-classes.js';

const validDays = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

// Returns all ticket classes.
export async function getAllTicketClasses(req, res) {
  try {
    const ticketClasses = await findAllTicketClasses();

    return res.status(200).json(ticketClasses);
  } catch (error) {
    console.error('Error fetching ticket classes:', error);

    return res.status(500).json({
      error: 'Failed to fetch ticket classes',
    });
  }
}

// Returns ticket classes available on a specific weekday.
export async function getTicketClassesForDay(req, res) {
  try {
    const day = req.query.day?.trim().toLowerCase();

    if (!day || !validDays.includes(day)) {
      return res.status(400).json({
        error: 'A valid day is required (monday through sunday)',
      });
    }

    const ticketClasses = await findTicketClassesForDay(day);

    return res.status(200).json(ticketClasses);
  } catch (error) {
    console.error('Error fetching ticket classes for day:', error);

    return res.status(500).json({
      error: 'Failed to fetch ticket classes',
    });
  }
}
