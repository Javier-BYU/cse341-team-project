import express from 'express';
import session from 'express-session';
import { describe, expect, test } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import {
    requireApiLogin,
    requireApiRole
} from '../src/middleware/auth.js';
import User from '../src/models/schemas/users.js';
import { createUser } from '../src/models/users.js';

const apiApp = express();
apiApp.use(session({
    secret: 'test-session-secret',
    resave: false,
    saveUninitialized: false
}));
apiApp.get('/set-role/:role', (req, res) => {
    req.session.user = { role: req.params.role };
    return res.sendStatus(204);
});
apiApp.get('/protected', requireApiLogin, (req, res) => res.json({ ok: true }));
apiApp.get('/admin', requireApiRole('admin'), (req, res) => res.json({ ok: true }));

describe('Authentication', () => {
    test('creates both standard roles during database connection', async () => {
        const { getDb } = await import('../src/db/connect.js');
        const db = getDb();
        const roles = await db.collection('roles').find({}).toArray();

        expect(roles.map((role) => role.name).sort()).toEqual(['admin', 'user']);
    });

    test('registers a user with a hashed password and logs in', async () => {
        const agent = request.agent(app);
        const registerResponse = await agent
            .post('/register')
            .type('form')
            .send({
                displayName: 'Test User',
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123',
                confirmPassword: 'password123'
            });

        expect(registerResponse.status).toBe(302);
        expect(registerResponse.headers.location).toBe('/login?registered=1');

        const user = await User.findOne({ username: 'testuser' }).select('+passwordHash').lean();
        expect(user.passwordHash).not.toBe('password123');
        expect(user.passwordHash).toContain(':');
        expect(user.role).toBeDefined();

        const loginResponse = await agent
            .post('/login')
            .type('form')
            .send({ identifier: 'testuser', password: 'password123' });

        expect(loginResponse.status).toBe(302);
        expect(loginResponse.headers.location).toBe('/admin');
    });

    test('protects the admin page and redirects a regular user to 403', async () => {
        await createUser({
            displayName: 'Regular User',
            username: 'regularuser',
            email: 'regular@example.com',
            password: 'password123'
        });

        const agent = request.agent(app);
        await agent
            .post('/login')
            .type('form')
            .send({ identifier: 'regularuser', password: 'password123' });

        const response = await agent.get('/admin');
        expect(response.status).toBe(302);
        expect(response.headers.location).toBe('/403');
    });

    test('shows the dashboard welcome message to admins', async () => {
        await createUser({
            displayName: 'Admin User',
            username: 'adminuser',
            email: 'admin@example.com',
            password: 'password123',
            roleName: 'admin'
        });

        const agent = request.agent(app);
        await agent
            .post('/login')
            .type('form')
            .send({ identifier: 'adminuser', password: 'password123' });

        const response = await agent.get('/admin');
        expect(response.status).toBe(200);
        expect(response.text).toContain('Welcome to the Admin Dashboard');
    });

    test('redirects signed-out users to login and logs users out', async () => {
        const agent = request.agent(app);
        const pageResponse = await agent.get('/admin');
        expect(pageResponse.status).toBe(302);
        expect(pageResponse.headers.location).toBe('/login');

        await createUser({
            displayName: 'Logout User',
            username: 'logoutuser',
            email: 'logout@example.com',
            password: 'password123'
        });
        await agent
            .post('/login')
            .type('form')
            .send({ identifier: 'logoutuser', password: 'password123' });

        const logoutResponse = await agent.post('/logout');
        expect(logoutResponse.status).toBe(302);
        expect(logoutResponse.headers.location).toBe('/');

        const afterLogoutResponse = await agent.get('/admin');
        expect(afterLogoutResponse.headers.location).toBe('/login');
    });

    test('returns API authentication and authorization errors', async () => {
        const signedOutResponse = await request(apiApp).get('/protected');
        expect(signedOutResponse.status).toBe(401);
        expect(signedOutResponse.body).toEqual({ error: 'Authentication required.' });

        const agent = request.agent(apiApp);
        await agent.get('/set-role/user');
        const forbiddenResponse = await agent.get('/admin');
        expect(forbiddenResponse.status).toBe(403);
        expect(forbiddenResponse.body).toEqual({ error: 'Forbidden.' });

        await agent.get('/set-role/admin');
        const authorizedResponse = await agent.get('/admin');
        expect(authorizedResponse.status).toBe(200);
        expect(authorizedResponse.body).toEqual({ ok: true });
    });
});
