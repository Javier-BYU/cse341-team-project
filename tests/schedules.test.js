import { describe, expect, test } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import swaggerSpec from '../src/config/swagger.js';

describe('GET /api/trips/:tripId/schedules', () => {
  test('returns all schedules for a trip', async () => {
    const response = await request(app).get('/api/trips/alpine-panorama/schedules');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tripId: 'alpine-panorama' })
      ])
    );
  });

  test('filters schedules by month', async () => {
    const response = await request(app).get(
      '/api/trips/alpine-panorama/schedules?month=4'
    );

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body.every((schedule) => schedule.months.includes(4))).toBe(true);
  });

  test('rejects invalid months', async () => {
    const response = await request(app).get(
      '/api/trips/alpine-panorama/schedules?month=13'
    );

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  test('returns not found when no schedules match the trip and month', async () => {
    const response = await request(app).get(
      '/api/trips/alpine-panorama/schedules?month=12'
    );

    expect(response.status).toBe(404);
  });

  test('renders trip details with the asynchronous schedule selector', async () => {
    const response = await request(app).get('/trips/alpine-panorama');

    expect(response.status).toBe(200);
    expect(response.text).toContain('id="schedule-month"');
    expect(response.text).toContain('/api/trips/');
    expect(response.text).toContain('Loading schedules...');
  });

  test('documents the schedule endpoint and month query in Swagger', async () => {
    const operation = swaggerSpec.paths['/api/trips/{id}/schedules'].get;
    const response = await request(app).get('/api-docs/');

    expect(operation.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'month', in: 'query' })
      ])
    );
    expect(response.status).toBe(200);
    expect(response.text).toContain('Swagger UI');
  });
});
