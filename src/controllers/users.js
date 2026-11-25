
import {
    getAllUsers as findAllUsers,
    getUserById as findUserById,
    updateUser as updateUserRecord,
    deleteUser as deleteUserRecord
} from '../models/users.js';

// Checks whether the signed-in user is an administrator.
const isAdmin = (req) => req.session.user.role === 'admin';

// Checks whether a user can manage the requested account.
const canManageUser = (req, userId) => (
    isAdmin(req) || req.session.user.id === userId
);

// Returns all users for administrators and only the signed-in
// user's account for regular users.
const getAllUsers = async (req, res) => {
    try {
        if (!isAdmin(req)) {
            const user = await findUserById(req.session.user.id);

            if (!user) {
                return res.status(404).json({
                    error: 'User not found.'
                });
            }

            return res.status(200).json({ users: [user] });
        }

        const users = await findAllUsers();

        return res.status(200).json({ users });
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
