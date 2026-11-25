
import TicketClass from './schemas/ticket-classes.js';

// Retrieves all ticket classes.
const getAllTicketClasses = async () => {
  return TicketClass.find({}).lean();
};

// Retrieves ticket classes available on a specific day.
const getTicketClassesForDay = async (day) => {
  return TicketClass.find({
    availableDays: day.toLowerCase(),
  }).lean();
};

export {
  getAllTicketClasses,
  getTicketClassesForDay,
};
