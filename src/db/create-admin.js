import { closeDb, connectToDb } from './connect.js';
import { createUser, getUserByUsername } from '../models/users.js';
import User from '../models/schemas/users.js';
import { getRoleByName } from '../models/roles.js';

const displayName = process.env.ADMIN_DISPLAY_NAME;
const username = process.env.ADMIN_USERNAME;
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

if (!displayName || !username || !email || !password) {
    throw new Error(
        'ADMIN_DISPLAY_NAME, ADMIN_USERNAME, ADMIN_EMAIL, and ADMIN_PASSWORD are required.'
    );
}

try {
    await connectToDb();
    const existingUser = await getUserByUsername(username);
    const adminRole = await getRoleByName('admin');

    if (existingUser) {
        await User.updateOne(
            { _id: existingUser._id },
            {
                $set: {
                    displayName,
                    email: email.toLowerCase(),
                    role: adminRole._id
                }
            }
        );
    } else {
        await createUser({
            displayName,
            username,
            email,
            password,
            roleName: 'admin'
        });
    }

    console.log(`Administrator "${username}" is ready.`);
} finally {
    await closeDb();
}
