
import { Router } from 'express';
import {
    deleteUser,
    getAllUsers,
    updateUser
} from '../controllers/users.js';
import { requireApiLogin } from '../middleware/auth.js';

const router = Router();

// All user-management endpoints require authentication.
router.use(requireApiLogin);

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Authenticated user account management
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get users accessible to the logged-in user
 *     description: Administrators receive all matching users. Regular users receive only their own matching account. Results are sorted by username in ascending order and never include password hashes.
 *     tags: [Users]
 *     security:
 *       - sessionCookie: []
 *     parameters:
 *       - in: query
 *         name: page
 *         description: Page number (defaults to 1)
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         description: Number of users per page (defaults to 10)
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 10
 *       - in: query
 *         name: role
 *         description: Exact role name to filter by
 *         schema:
 *           type: string
 *           enum: [admin, user]
 *       - in: query
 *         name: search
 *         description: Case-insensitive substring search across display name, username, and email
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: A page of matching users and pagination metadata.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 total:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *       400:
 *         description: Invalid pagination or filter parameters.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Access forbidden.
 *       500:
 *         description: Internal server error.
 */
router.get('/', getAllUsers);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update a user account
 *     description: Administrators can update any user. Regular users can update only their own account. Passwords are securely hashed before storage.
 *     tags: [Users]
 *     security:
 *       - sessionCookie: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB user ID.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUser'
 *     responses:
 *       200:
 *         description: User updated successfully.
 *       400:
 *         description: Invalid ID, validation error, or missing update fields.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Access forbidden.
 *       404:
 *         description: User not found.
 *       409:
 *         description: Username or email is already in use.
 *       500:
 *         description: Internal server error.
 */
router.put('/:id', updateUser);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete a user account
 *     description: Administrators can delete any user. Regular users can delete only their own account.
 *     tags: [Users]
 *     security:
 *       - sessionCookie: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB user ID.
 *     responses:
 *       200:
 *         description: User deleted successfully.
 *       400:
 *         description: Invalid user ID.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Access forbidden.
 *       404:
 *         description: User not found.
 *       500:
 *         description: Internal server error.
 */
router.delete('/:id', deleteUser);

export default router;
