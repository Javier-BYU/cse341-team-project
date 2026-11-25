import { describe, expect, test } from 'vitest';
import request from 'supertest';
import app from '../app.js';

describe('Trip API', () => {
    test('returns trips and pagination metadata with default values', async () => {
        const response = await request(app).get('/api/trips');

        expect(response.status).toBe(200);
        expect(response.body.trips).toHaveLength(6);
        expect(response.body).toMatchObject({
            page: 1,
            limit: 10,
            total: 6,
            totalPages: 1
        });
        expect(response.body.trips).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: 'alpine-panorama',
                    name: 'Alpine Panorama Express'
                })
            ])
        );
    });

    test('returns the requested trip page', async () => {
        const response = await request(app).get('/api/trips?page=2&limit=2');

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            page: 2,
            limit: 2,
            total: 6,
            totalPages: 3
        });
        expect(response.body.trips).toHaveLength(2);
    });

    test.each([
        ['page=-1', 'negative page'],
        ['page=0', 'zero page'],
        ['limit=abc', 'non-numeric limit'],
        ['page=1.5', 'fractional page']
    ])('rejects invalid pagination parameter: %s (%s)', async (query) => {
        const response = await request(app).get(`/api/trips?${query}`);

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
            error: 'page and limit must be positive integers'
        });
    });

    test('returns a trip by ID', async () => {
        const response = await request(app).get('/api/trips/alpine-panorama');

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            id: 'alpine-panorama',
            name: 'Alpine Panorama Express'
        });
    });

    test('returns 404 for an unknown trip', async () => {
        const response = await request(app).get('/api/trips/not-a-trip');

        expect(response.status).toBe(404);
        expect(response.body).toEqual({ error: 'Trip not found' });
    });
});
