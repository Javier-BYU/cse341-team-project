
import {
    getUsers as findUsers,
    getUserById as findUserById,
    updateUser as updateUserRecord,
    deleteUser as deleteUserRecord
} from '../models/users.js';

const parsePositiveInteger = (value, defaultValue) => {
    if (value === undefined) {
        return defaultValue;
    }

    if (typeof value !== 'string' || !/^\d+$/.test(value)) {
        return null;
    }

    const parsedValue = Number(value);

    return Number.isSafeInteger(parsedValue) && parsedValue > 0
        ? parsedValue
        : null;
};

// Checks whether the signed-in user is an administrator.
const isAdmin = (req) => req.session.user.role === 'admin';

// Checks whether a user can manage the requested account.
const canManageUser = (req, userId) => (
    isAdmin(req) || req.session.user.id === userId
);

// Returns a filtered page of users within the signed-in user's access scope.
const getAllUsers = async (req, res) => {
    const page = parsePositiveInteger(req.query.page, 1);
    const limit = parsePositiveInteger(req.query.limit, 10);
    const { role, search } = req.query;

    if (
        page === null ||
        limit === null ||
        !Number.isSafeInteger((page - 1) * limit) ||
        (role !== undefined && typeof role !== 'string') ||
        (search !== undefined && typeof search !== 'string')
    ) {
        return res.status(400).json({
            error: 'page and limit must be positive integers; role and search must be strings.'
        });
    }

    try {
        const filters = {
            role: role || undefined,
            search: search || undefined,
            userId: isAdmin(req) ? undefined : req.session.user.id
        };
        const { users, total } = await findUsers(page, limit, filters);
        const totalPages = Math.max(1, Math.ceil(total / limit));

        return res.status(200).json({
            users,
            page,
            limit,
            total,
            totalPages
        });
    } catch (error) {
        console.error('Error fetching users:', error);

        return res.status(500).json({
            error: 'Failed to fetch users.'
        });
    }
};

// Updates permitted profile fields without allowing role changes.
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;

        if (!canManageUser(req, id)) {
            return res.status(403).json({
                error: 'You are not allowed to update this user.'
            });
        }

        const allowedFields = [
            'displayName',
            'username',
            'email',
            'password'
        ];

        const updates = {};

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                if (
                    typeof req.body[field] !== 'string' ||
                    !req.body[field].trim()
                ) {
                    return res.status(400).json({
                        error: `Invalid value for ${field}.`
                    });
                }

                updates[field] = req.body[field].trim();
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                error: 'No valid user information was provided.'
            });
        }

        const user = await updateUserRecord(id, updates);

        if (!user) {
            return res.status(404).json({
                error: 'User not found.'
            });
        }

        return res.status(200).json({
            message: 'User updated successfully.',
            user
        });
    } catch (error) {
        console.error('Error updating user:', error);

        if (error.name === 'CastError') {
            return res.status(400).json({
                error: 'Invalid user ID.'
            });
        }

        if (error.code === 11000) {
            return res.status(409).json({
                error: 'Username or email is already in use.'
            });
        }

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                error: 'Invalid user information.'
            });
        }

        return res.status(500).json({
            error: 'Failed to update user.'
        });
    }
};

// Deletes a user when the signed-in user has permission.
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        if (!canManageUser(req, id)) {
            return res.status(403).json({
                error: 'You are not allowed to delete this user.'
            });
        }

        const user = await deleteUserRecord(id);

        if (!user) {
            return res.status(404).json({
                error: 'User not found.'
            });
        }

        return res.status(200).json({
            message: 'User deleted successfully.',
            user
        });
    } catch (error) {
        console.error('Error deleting user:', error);

        if (error.name === 'CastError') {
            return res.status(400).json({
                error: 'Invalid user ID.'
            });
        }

        return res.status(500).json({
            error: 'Failed to delete user.'
        });
    }
};

export { deleteUser, getAllUsers, updateUser };
