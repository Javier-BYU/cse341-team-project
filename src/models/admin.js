
import User from './schemas/users.js';
import { hashPassword } from '../includes/password.js';
import { getRoleByName } from './roles.js';

const ensureDefaultAdmin = async () => {
    const email = (process.env.ADMIN_EMAIL || 'admin@example.com').toLowerCase();
    const username = (process.env.ADMIN_USERNAME || 'admin').toLowerCase();
    const displayName = process.env.ADMIN_DISPLAY_NAME
        || 'Kizuna Rail Administrator';
    const password = process.env.ADMIN_PASSWORD;

    if (!password || password.length < 12) {
        throw new Error(
            'ADMIN_PASSWORD must be set and contain at least 12 characters.'
        );
    }

    const adminRole = await getRoleByName('admin');

    if (!adminRole) {
        throw new Error('The admin role does not exist.');
    }

    const [emailUser, usernameUser] = await Promise.all([
        User.findOne({ email }).select('_id email username').lean(),
        User.findOne({ username }).select('_id email username').lean()
    ]);

    if (
        emailUser
        && usernameUser
        && String(emailUser._id) !== String(usernameUser._id)
    ) {
        throw new Error(
            'ADMIN_EMAIL and ADMIN_USERNAME belong to different accounts.'
        );
    }

    const existingUser = emailUser || usernameUser;

    if (existingUser) {
        if (
            existingUser.email !== email
            || existingUser.username !== username
        ) {
            throw new Error(
                'An existing account conflicts with the configured administrator details.'
            );
        }

        await User.updateOne(
            { _id: existingUser._id },
            { $set: { role: adminRole._id } }
        );

        console.log('Default administrator account verified.');
        return;
    }

    const passwordHash = await hashPassword(password);

    await User.create({
        displayName,
        username,
        email,
        passwordHash,
        role: adminRole._id
    });

    console.log('Default administrator account created.');
};

export { ensureDefaultAdmin };
