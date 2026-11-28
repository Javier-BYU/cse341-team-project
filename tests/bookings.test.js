import { describe, expect, test } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { createUser } from '../src/models/users.js';
import {
    createBooking,
    deleteBooking,
    getBookingById,
    updateBooking
} from '../src/models/bookings.js';

const createTestBooking = async (id, email) => createBooking({
    id,
    scheduleId: 1,
    tripId: 'alpine-panorama',
    ticketClass: 'first',
    selectedDay: 'monday',
    passengers: [
        {
            firstName: 'Booking',
            lastName: 'Passenger',
            email,
            phone: '1234567890'
        }
    ]
});

const createAuthenticatedAgent = async (role = 'user', email = 'rail@example.com') => {
    const username = `${role}-${Math.random().toString(36).slice(2, 10)}`;
    await createUser({
        displayName: `${role} user`,
        username,
        email,
        password: 'password123',
        roleName: role
    });

    const agent = request.agent(app);
    await agent
        .post('/login')
        .type('form')
        .send({ identifier: username, password: 'password123' });

    return agent;
};

const validUpdate = (email = 'rail@example.com') => ({
    scheduleId: 1,
    tripId: 'alpine-panorama',
    ticketClass: 'premium',
    selectedDay: 'Monday',
    passengers: [
        {
            firstName: 'Updated',
            lastName: 'Passenger',
            email,
            phone: '1234567890'
        }
    ]
});

describe('Protected booking administration API', () => {
    test('redirects signed-out page requests and rejects unauthenticated API requests', async () => {
        const pageResponse = await request(app).get('/bookings-admin');
        const bookingsResponse = await request(app).get('/api/bookings');

        expect(pageResponse.status).toBe(302);
        expect(pageResponse.headers.location).toBe('/login');
        expect(bookingsResponse.status).toBe(401);
    });

    test('standard users see and manage only bookings containing their case-insensitive email', async () => {
        await createTestBooking('OWN-BOOKING', 'RAIL+route@example.com');
        await createTestBooking('OTHER-BOOKING', 'other@example.com');
        const agent = await createAuthenticatedAgent(
            'user',
            'rail+route@example.com'
        );

        const pageResponse = await agent.get('/bookings-admin');
        const bookingsResponse = await agent.get('/api/bookings');
        const mineResponse = await agent.get('/api/bookings/mine');

        expect(pageResponse.status).toBe(200);
        expect(bookingsResponse.status).toBe(200);
        expect(bookingsResponse.body.bookings.map(({ id }) => id)).toEqual([
            'OWN-BOOKING'
        ]);
        expect(mineResponse.status).toBe(200);
        expect(mineResponse.body.bookings.map(({ id }) => id)).toEqual([
            'OWN-BOOKING'
        ]);

        const csrfResponse = await agent.get('/api/csrf-token');
        const csrfToken = csrfResponse.body.csrfToken;
        const updateResponse = await agent
            .put('/api/bookings/OWN-BOOKING')
            .set('X-CSRF-Token', csrfToken)
            .send(validUpdate('rail+route@example.com'));

        expect(updateResponse.status).toBe(200);
        expect(updateResponse.body.booking.ticketClass).toBe('premium');

        await createTestBooking('REMOVED-EMAIL-BOOKING', 'RAIL+route@example.com');
        const removePassengerEmailResponse = await agent
            .put('/api/bookings/REMOVED-EMAIL-BOOKING')
            .set('X-CSRF-Token', csrfToken)
            .send(validUpdate('different@example.com'));
        const bookingsAfterEmailRemoval = await agent.get('/api/bookings');
        const revokedUpdate = await agent
            .put('/api/bookings/REMOVED-EMAIL-BOOKING')
            .set('X-CSRF-Token', csrfToken)
            .send(validUpdate());
        const revokedDelete = await agent
            .delete('/api/bookings/REMOVED-EMAIL-BOOKING')
            .set('X-CSRF-Token', csrfToken);

        expect(removePassengerEmailResponse.status).toBe(200);
        expect(bookingsAfterEmailRemoval.body.bookings.map(({ id }) => id)).toEqual([
            'OWN-BOOKING'
        ]);
        expect(revokedUpdate.status).toBe(403);
        expect(revokedDelete.status).toBe(403);

        const unauthorizedUpdate = await agent
            .put('/api/bookings/OTHER-BOOKING')
            .set('X-CSRF-Token', csrfToken)
            .send(validUpdate());
        const unauthorizedDelete = await agent
            .delete('/api/bookings/OTHER-BOOKING')
            .set('X-CSRF-Token', csrfToken);

        expect(unauthorizedUpdate.status).toBe(403);
        expect(unauthorizedDelete.status).toBe(403);

        const deleteResponse = await agent
            .delete('/api/bookings/OWN-BOOKING')
            .set('X-CSRF-Token', csrfToken);

        expect(deleteResponse.status).toBe(200);
        expect(await getBookingById('OWN-BOOKING')).toBeNull();
        expect(await getBookingById('OTHER-BOOKING')).not.toBeNull();
    });

    test('administrators see and can modify bookings regardless of passenger email', async () => {
        await createTestBooking('ADMIN-BOOKING', 'other@example.com');
        const agent = await createAuthenticatedAgent(
            'admin',
            'admin@example.com'
        );

        const pageResponse = await agent.get('/bookings-admin');
        const bookingsResponse = await agent.get('/api/bookings');
        const csrfToken = (await agent.get('/api/csrf-token')).body.csrfToken;
        const updateResponse = await agent
            .put('/api/bookings/ADMIN-BOOKING')
            .set('X-CSRF-Token', csrfToken)
            .send(validUpdate('other@example.com'));

        expect(pageResponse.status).toBe(200);
        expect(bookingsResponse.body.bookings.map(({ id }) => id)).toContain(
            'ADMIN-BOOKING'
        );
        expect(updateResponse.status).toBe(200);

        const deleteResponse = await agent
            .delete('/api/bookings/ADMIN-BOOKING')
            .set('X-CSRF-Token', csrfToken);

        expect(deleteResponse.status).toBe(200);
        expect(await getBookingById('ADMIN-BOOKING')).toBeNull();
    });

    test('rejects missing CSRF tokens, invalid or immutable fields, and missing bookings', async () => {
        await createTestBooking('VALIDATION-BOOKING', 'rail@example.com');
        const agent = await createAuthenticatedAgent();
        const csrfToken = (await agent.get('/api/csrf-token')).body.csrfToken;

        const missingTokenResponse = await agent
            .put('/api/bookings/VALIDATION-BOOKING')
            .send(validUpdate());
        const invalidTokenResponse = await agent
            .delete('/api/bookings/VALIDATION-BOOKING')
            .set('X-CSRF-Token', `${csrfToken}invalid`);
        const immutableFieldResponse = await agent
            .put('/api/bookings/VALIDATION-BOOKING')
            .set('X-CSRF-Token', csrfToken)
            .send({ ...validUpdate(), id: 'REPLACED-ID' });
        const invalidScheduleResponse = await agent
            .put('/api/bookings/VALIDATION-BOOKING')
            .set('X-CSRF-Token', csrfToken)
            .send({ ...validUpdate(), scheduleId: 9999 });
        const missingBookingResponse = await agent
            .delete('/api/bookings/DOES-NOT-EXIST')
            .set('X-CSRF-Token', csrfToken);

        expect(missingTokenResponse.status).toBe(403);
        expect(invalidTokenResponse.status).toBe(403);
        expect(immutableFieldResponse.status).toBe(400);
        expect(invalidScheduleResponse.status).toBe(400);
        expect(missingBookingResponse.status).toBe(404);
    });

    test('uses atomic ownership filters for model updates and deletes', async () => {
        await createTestBooking('ATOMIC-BOOKING', 'owner@example.com');

        const unauthorizedUpdate = await updateBooking(
            'ATOMIC-BOOKING',
            { ticketClass: 'premium' },
            'not-owner@example.com'
        );
        const unauthorizedDelete = await deleteBooking(
            'ATOMIC-BOOKING',
            'not-owner@example.com'
        );

        expect(unauthorizedUpdate).toBeNull();
        expect(unauthorizedDelete).toBeNull();
        expect((await getBookingById('ATOMIC-BOOKING')).ticketClass).toBe('first');
    });

    test('keeps public booking creation operational', async () => {
        const ticketClassesResponse = await request(app).get('/api/ticket-classes');
        const response = await request(app)
            .post('/api/bookings')
            .send({
                scheduleId: 1,
                tripId: 'alpine-panorama',
                ticketClass: 'first',
                selectedDay: 'monday',
                passengers: [
                    {
                        firstName: 'Public',
                        lastName: 'Booking',
                        email: 'public@example.com',
                        phone: '1234567890'
                    }
                ]
            });

        expect(ticketClassesResponse.status).toBe(200);
        expect(ticketClassesResponse.body.map(({ class: className }) => className))
            .toEqual(expect.arrayContaining(['standard', 'premium', 'first']));
        expect(response.status).toBe(201);
        expect(await getBookingById(response.body.booking.id)).not.toBeNull();

        const confirmationResponse = await request(app)
            .get(`/trips/confirmation/${response.body.booking.id}`);

        expect(confirmationResponse.status).toBe(200);
        expect(confirmationResponse.text).toContain('public@example.com');
    });
});
