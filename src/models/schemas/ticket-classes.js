
import mongoose from 'mongoose';

const ticketClassSchema = new mongoose.Schema(
  {
    class: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    pricePerKm: {
      type: Number,
      required: true,
      min: 0,
    },
    availableDays: {
      type: [
        {
          type: String,
          enum: [
            'monday',
            'tuesday',
            'wednesday',
            'thursday',
            'friday',
            'saturday',
            'sunday',
          ],
        },
      ],
      required: true,
      validate: {
        validator: (availableDays) => availableDays.length > 0,
        message: 'A ticket class must be available on at least one weekday.',
      },
    },
    amenities: {
      type: [String],
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const TicketClass = mongoose.model(
  'TicketClass',
  ticketClassSchema,
  'ticketClasses'
);

export default TicketClass;
