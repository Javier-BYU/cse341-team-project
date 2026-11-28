
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

const getPassengerEmailFilter = (email) => ({
    $expr: {
        $in: [
            email.trim().toLowerCase(),
            {
                $map: {
                    input: { $ifNull: ['$passengers', []] },
                    as: 'passenger',
                    in: {
                        $toLower: {
                            $trim: {
                                input: {
                                    $ifNull: ['$$passenger.email', '']
                                }
                            }
                        }
                    }
                }
            }
        ]
    }
});

const getBookingsByPassengerEmail = async (email) => {
    return Booking.find(getPassengerEmailFilter(email)).lean();
};

/**
 * Retrieves a booking using its unique booking reference.
 * @param {string} id - The booking reference.
 * @returns {Promise<Object|null>} The matching booking or null.
 */
const getBookingById = async (id) => Booking.findOne({ id }).lean();

/**
 * Updates an existing booking, optionally requiring a passenger email match.
 * The ownership condition is part of the same atomic database mutation.
 * @param {string} id - The booking reference.
 * @param {Object} updates - Allowlisted booking fields.
 * @param {string|null} ownerEmail - Required passenger email for standard users.
 * @returns {Promise<Object|null>} The updated booking or null.
 */
const updateBooking = async (id, updates, ownerEmail = null) => {
    const filter = { id };

    if (ownerEmail !== null) {
        Object.assign(filter, getPassengerEmailFilter(ownerEmail));
    }

    return Booking.findOneAndUpdate(
        filter,
        { $set: updates },
        { new: true, runValidators: true, lean: true }
    );
};

/**
 * Deletes an existing booking, optionally requiring a passenger email match.
 * The ownership condition is part of the same atomic database mutation.
 * @param {string} id - The booking reference.
 * @param {string|null} ownerEmail - Required passenger email for standard users.
 * @returns {Promise<Object|null>} The deleted booking or null.
 */
const deleteBooking = async (id, ownerEmail = null) => {
    const filter = { id };

    if (ownerEmail !== null) {
        Object.assign(filter, getPassengerEmailFilter(ownerEmail));
    }

    return Booking.findOneAndDelete(filter).lean();
};

export {
    createBooking,
    getAllBookings,
    getBookingsByPassengerEmail,
    getBookingById,
    updateBooking,
    deleteBooking
};
