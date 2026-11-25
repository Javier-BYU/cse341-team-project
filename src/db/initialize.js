
import trips from './seeds/trips.json' with { type: 'json' };
import schedules from './seeds/schedules.json' with { type: 'json' };
import stations from './seeds/stations.json' with { type: 'json' };
import ticketClasses from './seeds/ticket-classes.json' with { type: 'json' };
import trains from './seeds/trains.json' with { type: 'json' };

const roles = [
  { name: 'admin' },
  { name: 'user' }
];

const starterCollections = [
  ['trips', trips],
  [
    'schedules',
    schedules.map((schedule) => {
      const trip = trips.find(({ id }) => id === schedule.tripId);

      if (!trip) {
        throw new Error(`No trip found for schedule ${schedule.id}.`);
      }

      return { ...schedule, months: trip.operatingMonths };
    })
  ],
  ['stations', stations],
  ['ticketClasses', ticketClasses],
  ['trains', trains],
  ['roles', roles]
];

// Safely inserts ticket classes only when the collection is empty.
const initializeTicketClasses = async (db) => {
  if (!db) {
    throw new Error('A database connection is required to initialize ticket classes.');
  }

  const collection = db.collection('ticketClasses');
  const existingCount = await collection.countDocuments();

  if (existingCount === 0) {
    await collection.insertMany(ticketClasses);
    console.log('Ticket classes initialized successfully.');
  } else {
    console.log(`Ticket classes already exist (${existingCount}). No changes made.`);
  }
};

// Full database initialization. This resets starter collections and bookings.
const initializeDatabase = async (db) => {
  if (!db) {
    throw new Error('A database connection is required to initialize data.');
  }

  for (const [collectionName, documents] of starterCollections) {
    const collection = db.collection(collectionName);

    await collection.deleteMany({});
    await collection.insertMany(documents);
  }

  const bookings = db.collection('bookings');

  await bookings.deleteMany({});
  await bookings.createIndex({ id: 1 }, { unique: true });
};

export {
  initializeDatabase,
  initializeTicketClasses,
  roles,
  starterCollections
};
