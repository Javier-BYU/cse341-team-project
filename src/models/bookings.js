
import Booking from './schemas/bookings.js';

/**
 * Creates and saves a new booking.
 * @param {Object} booking - The booking information.
 * @returns {Promise<Object>} The saved booking.
 */
const createBooking = async (booking) => Booking.create(booking);

/**
 * Retrieves all bookings from the database.
 * @returns {Promise<Array>} A list of bookings.
 */
const getAllBookings = async () => Booking.find({}).lean();

/**
 * Retrieves a booking using its unique booking reference.
 * @param {string} id - The booking reference.
 * @returns {Promise<Object|null>} The matching booking or null.
 */
const getBookingById = async (id) => Booking.findOne({ id }).lean();

export { createBooking, getAllBookings, getBookingById };
