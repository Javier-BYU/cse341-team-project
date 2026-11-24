import User from './schemas/users.js';
import { hashPassword } from '../includes/password.js';
import { ensureStandardRoles, getRoleByName } from './roles.js';

// Creates a new user and securely hashes their password.
const createUser = async ({
    displayName,
    username,
    email,
    password,
    roleName = 'user'
}) => {
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

// Retrieves a user by username for authentication.
const getUserByUsername = async (username) => User.findOne({
    username: username.toLowerCase()
})
    .select('+passwordHash')
    .populate('role')
    .lean();

// Retrieves a user by email for authentication.
const getUserByEmail = async (email) => User.findOne({
    email: email.toLowerCase()
})
    .select('+passwordHash')
    .populate('role')
    .lean();

// Retrieves a user by username or email for authentication.
const getUserByIdentifier = async (identifier) => {
    const normalizedIdentifier = identifier.toLowerCase();

    return User.findOne({
        $or: [
            { username: normalizedIdentifier },
            { email: normalizedIdentifier }
        ]
    })
        .select('+passwordHash')
        .populate('role')
        .lean();
};

// Retrieves all users without exposing password hashes.
const getAllUsers = async () => User.find()
    .select('-passwordHash')
    .populate('role', 'name')
    .sort({ createdAt: -1 })
    .lean();

// Retrieves one user by MongoDB ID without exposing password hashes.
const getUserById = async (id) => User.findById(id)
    .select('-passwordHash')
    .populate('role', 'name')
    .lean();

// Updates an existing user's information.
const updateUser = async (id, updates) => {
    const updateData = {};

    if (updates.displayName !== undefined) {
        updateData.displayName = updates.displayName;
    }

    if (updates.username !== undefined) {
        updateData.username = updates.username.toLowerCase();
    }

    if (updates.email !== undefined) {
        updateData.email = updates.email.toLowerCase();
    }

    // Always hash a new password before storing it.
    if (updates.password !== undefined) {
        updateData.passwordHash = await hashPassword(updates.password);
    }

    // Resolve a role name to its MongoDB reference when requested.
    if (updates.roleName !== undefined) {
        const role = await getRoleByName(updates.roleName);

        if (!role) {
            throw new Error(`Role "${updates.roleName}" does not exist.`);
        }

        updateData.role = role._id;
    }

    return User.findByIdAndUpdate(
        id,
        { $set: updateData },
        {
            new: true,
            runValidators: true
        }
    )
        .select('-passwordHash')
        .populate('role', 'name')
        .lean();
};

// Deletes a user by MongoDB ID.
const deleteUser = async (id) => User.findByIdAndDelete(id)
    .select('-passwordHash')
    .populate('role', 'name')
    .lean();

export {
    createUser,
    deleteUser,
    getAllUsers,
    getUserByEmail,
    getUserById,
    getUserByIdentifier,
    getUserByUsername,
    updateUser
};