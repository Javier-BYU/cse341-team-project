
import mongoose from 'mongoose';

// Defines the information stored for each passenger.
const passengerSchema = new mongoose.Schema(
    {
        firstName: {
            type: String,
            required: true,
            trim: true
        },
        lastName: {
            type: String,
            required: true,
            trim: true
        },
        email: {
            type: String,
            required: true,
            trim: true
        },
        phone: {
            type: String,
            required: true,
            trim: true
        }
    },
    {
        _id: false
    }
);

// Defines the information stored for each booking.
const bookingSchema = new mongoose.Schema(
    {
        id: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        scheduleId: {
            type: Number,
            required: true
        },
        tripId: {
            type: String,
            required: true,
            trim: true
        },
        ticketClass: {
            type: String,
            required: true,
            trim: true
        },
        selectedDay: {
            type: String,
            required: true,
            trim: true
        },
        passengers: {
            type: [passengerSchema],
            required: true,
            validate: {
                validator: (passengers) => passengers.length > 0,
                message: 'A booking must contain at least one passenger.'
            }
        }
    },
    {
        timestamps: true,
        collection: 'bookings'
    }
);

// Reuse the model if it has already been registered.
const Booking = mongoose.models.Booking
    || mongoose.model('Booking', bookingSchema);

export default Booking;
