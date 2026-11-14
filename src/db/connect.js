import { MongoClient } from 'mongodb';
import mongoose from 'mongoose';

let database;
let client;

const connectToDb = async (options = {}) => {
  if (database) {
    return database;
  }

  const connectionString = options.connectionString || process.env.MONGODB_URI;
  const databaseName = options.databaseName || process.env.MONGODB_DB_NAME || 'practice';

  if (!connectionString) {
    throw new Error('MONGODB_URI is required.');
  }

  client = new MongoClient(connectionString);
  await client.connect();
  try {
    await mongoose.connect(connectionString, { dbName: databaseName });
  } catch (error) {
    await client.close();
    client = undefined;
    throw error;
  }
  database = client.db(databaseName);
  return database;
};

const getDb = () => {
  if (!database) {
    throw new Error('Database not initialized. Call connectToDb first.');
  }
  return database;
};

const closeDb = async () => {
  const currentClient = client;
  client = undefined;
  database = undefined;
  await Promise.all([
    currentClient ? currentClient.close() : Promise.resolve(),
    mongoose.disconnect()
  ]);
};

export { closeDb, connectToDb, getDb };
