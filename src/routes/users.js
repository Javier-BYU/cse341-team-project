
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
 *     description: Administrators receive all users. Regular users receive only their own account.
 *     tags: [Users]
 *     security:
 *       - sessionCookie: []
 *     responses:
 *       200:
 *         description: Users retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       401:
 *         description: Authentication required.
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
