import User from './schemas/users.js';
import { hashPassword } from '../includes/password.js';
import { ensureStandardRoles, getRoleByName } from './roles.js';

const createUser = async ({ displayName, username, email, password, roleName = 'user' }) => {
    await ensureStandardRoles();
    const role = await getRoleByName(roleName);
    if (!role) {
        throw new Error(`Role "${roleName}" does not exist.`);
    }

    const passwordHash = await hashPassword(password);
    return User.create({
        displayName,
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        passwordHash,
        role: role._id
    });
};

const getUserByUsername = async (username) => User.findOne({
    username: username.toLowerCase()
}).select('+passwordHash').populate('role').lean();

const getUserByEmail = async (email) => User.findOne({
    email: email.toLowerCase()
}).select('+passwordHash').populate('role').lean();

const getUserByIdentifier = async (identifier) => {
    const normalizedIdentifier = identifier.toLowerCase();
    return User.findOne({
        $or: [{ username: normalizedIdentifier }, { email: normalizedIdentifier }]
    }).select('+passwordHash').populate('role').lean();
};

export {
    createUser,
    getUserByEmail,
    getUserByIdentifier,
    getUserByUsername
};
