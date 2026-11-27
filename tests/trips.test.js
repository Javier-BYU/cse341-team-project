import { describe, expect, test } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import seededTrips from '../src/db/seeds/trips.json' with { type: 'json' };
import swaggerSpec from '../src/config/swagger.js';

describe('Trip API', () => {
    test('returns trips and pagination metadata with default values', async () => {
        const response = await request(app).get('/api/trips');

        expect(response.status).toBe(200);
        expect(response.body.trips).toHaveLength(Math.min(10, seededTrips.length));
        expect(response.body).toMatchObject({
            page: 1,
            limit: 10,
            total: seededTrips.length,
            totalPages: Math.max(1, Math.ceil(seededTrips.length / 10))
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
            total: seededTrips.length,
            totalPages: Math.max(1, Math.ceil(seededTrips.length / 2))
        });
        expect(response.body.trips).toHaveLength(2);
    });

    test.each([
        ['region', 'central', (trip) => trip.region === 'central'],
        ['season', 'autumn', (trip) => trip.bestSeason === 'autumn']
    ])('filters by %s independently', async (filter, value, matches) => {
        const matchingTrips = seededTrips.filter(matches);
        const response = await request(app)
            .get(`/api/trips?${filter}=${encodeURIComponent(value)}`);

        expect(response.status).toBe(200);
        expect(response.body.total).toBe(matchingTrips.length);
        expect(response.body.trips).toHaveLength(
            Math.min(10, matchingTrips.length)
        );
    });

    test('filters trips by region and season before paginating', async () => {
        const matchingTrips = seededTrips.filter((trip) =>
            trip.region === 'central' && trip.bestSeason === 'autumn'
        );
        const response = await request(app)
            .get('/api/trips?region=central&season=autumn&page=1&limit=1');

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            page: 1,
            limit: 1,
            total: matchingTrips.length,
            totalPages: Math.max(1, matchingTrips.length)
        });
        expect(response.body.trips).toHaveLength(1);
        expect(response.body.trips[0]).toMatchObject({
            region: 'central',
            bestSeason: 'autumn'
        });
    });

    test('combines region, season, and keyword search', async () => {
        const matchingTrips = seededTrips.filter((trip) =>
            trip.region === 'central'
            && trip.bestSeason === 'autumn'
            && /gorge/i.test(`${trip.name} ${trip.description}`)
        );
        const response = await request(app)
            .get('/api/trips?region=central&season=autumn&search=gorge');

        expect(response.status).toBe(200);
        expect(response.body.total).toBe(matchingTrips.length);
        expect(response.body.trips.map(({ id }) => id)).toEqual(
            matchingTrips.map(({ id }) => id)
        );
    });

    test.each([
        ['name', 'ALPINE PANORAMA'],
        ['description', 'cherry blossom']
    ])('searches trip %s without case sensitivity', async (_field, search) => {
        const response = await request(app)
            .get(`/api/trips?search=${encodeURIComponent(search)}`);

        expect(response.status).toBe(200);
        expect(response.body.total).toBe(1);
    });

    test('treats special regex characters in search as literal text', async () => {
        const response = await request(app)
            .get(`/api/trips?search=${encodeURIComponent('[')}`);

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            trips: [],
            total: 0,
            totalPages: 1
        });
    });

    test('documents filters in Swagger and serves the Swagger UI', async () => {
        const parameters = swaggerSpec.paths['/api/trips'].get.parameters;
        const response = await request(app).get('/api-docs/');

        expect(parameters).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ name: 'region', in: 'query' }),
                expect.objectContaining({ name: 'season', in: 'query' }),
                expect.objectContaining({ name: 'search', in: 'query' })
            ])
        );
        expect(response.status).toBe(200);
        expect(response.text).toContain('Swagger UI');
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
