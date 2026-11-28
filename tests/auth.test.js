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
import { createBooking } from '../src/models/bookings.js';

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
        expect(loginResponse.headers.location).toBe('/dashboard');
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
        const loginResponse = await agent
            .post('/login')
            .type('form')
            .send({ identifier: 'adminuser', password: 'password123' });

        expect(loginResponse.headers.location).toBe('/admin');
        const response = await agent.get('/admin');
        expect(response.status).toBe(200);
        expect(response.text).toContain('Welcome to the Admin Dashboard');
    });

    test('redirects signed-out users to login and logs users out', async () => {
        const agent = request.agent(app);
        const pageResponse = await agent.get('/admin');
        expect(pageResponse.status).toBe(302);
        expect(pageResponse.headers.location).toBe('/login');

        const dashboardResponse = await agent.get('/dashboard');
        expect(dashboardResponse.status).toBe(302);
        expect(dashboardResponse.headers.location).toBe('/login');

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

    test("shows a standard user's dashboard and only their matching bookings", async () => {
        await createUser({
            displayName: 'Dashboard User',
            username: 'dashboarduser',
            email: 'dashboard@example.com',
            password: 'password123'
        });

        await createBooking({
            id: 'MATCHING-BOOKING',
            scheduleId: 1,
            tripId: 'alpine-panorama',
            ticketClass: 'First Class',
            selectedDay: 'Monday',
            passengers: [
                {
                    firstName: 'Dashboard',
                    lastName: 'User',
                    email: 'DASHBOARD@example.com',
                    phone: '1234567890'
                },
                {
                    firstName: 'Other',
                    lastName: 'Passenger',
                    email: 'other@example.com',
                    phone: '1234567890'
                }
            ]
        });
        await createBooking({
            id: 'OTHER-BOOKING',
            scheduleId: 2,
            tripId: 'sakura-valley',
            ticketClass: 'Standard Class',
            selectedDay: 'Tuesday',
            passengers: [
                {
                    firstName: 'Other',
                    lastName: 'Passenger',
                    email: 'other@example.com',
                    phone: '1234567890'
                }
            ]
        });

        const agent = request.agent(app);
        await agent
            .post('/login')
            .type('form')
            .send({ identifier: 'dashboarduser', password: 'password123' });

        const dashboardResponse = await agent.get('/dashboard');
        expect(dashboardResponse.status).toBe(200);
        expect(dashboardResponse.text).toContain('Welcome, Dashboard User.');
        expect(dashboardResponse.text).toContain('href="/bookings-admin"');
        expect(dashboardResponse.text).toContain('href="/users"');
        expect(dashboardResponse.text).toContain('href="/dashboard">Dashboard</a>');
        expect(dashboardResponse.text).toContain('fetch(\'/api/bookings/mine\')');

        const bookingsResponse = await agent.get('/api/bookings/mine');
        expect(bookingsResponse.status).toBe(200);
        expect(bookingsResponse.body.bookings).toHaveLength(1);
        expect(bookingsResponse.body.bookings[0]).toMatchObject({
            id: 'MATCHING-BOOKING',
            passengerCount: 2
        });
        expect(bookingsResponse.body.bookings[0].passengers).toBeUndefined();
    });

    test('shows signed-out and admin navigation links appropriately', async () => {
        const signedOutResponse = await request(app).get('/');
        expect(signedOutResponse.text).toContain('href="/login">Log in</a>');
        expect(signedOutResponse.text).toContain('href="/register">Register</a>');
        expect(signedOutResponse.text).not.toContain('href="/dashboard">Dashboard</a>');
        expect(signedOutResponse.text).not.toContain('href="/logout">Log out</a>');

        await createUser({
            displayName: 'Navigation Admin',
            username: 'navigationadmin',
            email: 'navigationadmin@example.com',
            password: 'password123',
            roleName: 'admin'
        });
        const agent = request.agent(app);
        await agent
            .post('/login')
            .type('form')
            .send({ identifier: 'navigationadmin', password: 'password123' });

        const signedInResponse = await agent.get('/');
        expect(signedInResponse.text).toContain('href="/admin">Dashboard</a>');
        expect(signedInResponse.text).toContain('href="/logout">Log out</a>');
        expect(signedInResponse.text).not.toContain('href="/login">Log in</a>');
        expect(signedInResponse.text).not.toContain('href="/register">Register</a>');
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

        const signedOutBookingsResponse = await request(app).get('/api/bookings/mine');
        expect(signedOutBookingsResponse.status).toBe(401);
    });
});
