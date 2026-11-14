import mongoose from 'mongoose';

const scheduleSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
    unique: true,
  },
  tripId: {
    type: String,
    required: true,
    index: true,
    trim: true,
  },
  departureTime: {
    type: String,
    required: true,
    trim: true,
  },
  arrivalTime: {
    type: String,
    required: true,
    trim: true,
  },
  daysOfWeek: {
    type: [String],
    required: true,
  },
  months: {
    type: [{ type: Number, min: 1, max: 12 }],
    required: true,
  },
  status: {
    type: Boolean,
    required: true,
  },
});

const schedule = mongoose.model('Schedule', scheduleSchema);

export default schedule;
