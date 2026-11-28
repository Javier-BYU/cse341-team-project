import { describe, expect, test } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { createUser } from '../src/models/users.js';

const createAndSignIn = async ({
    displayName,
    username,
    email,
    roleName = 'user'
}) => {
    await createUser({
        displayName,
        username,
        email,
        password: 'password123',
        roleName
    });

    const agent = request.agent(app);
    const response = await agent
        .post('/login')
        .type('form')
        .send({ identifier: username, password: 'password123' });

    expect(response.status).toBe(302);

    return agent;
};

describe('User API', () => {
    test('requires authentication to list users', async () => {
        const response = await request(app).get('/api/users');

        expect(response.status).toBe(401);
    });

    test('returns users sorted and paginated without password hashes', async () => {
        const agent = await createAndSignIn({
            displayName: 'Admin User',
            username: 'admin',
            email: 'admin@example.com',
            roleName: 'admin'
        });

        await createUser({
            displayName: 'Zoe User',
            username: 'zoe',
            email: 'zoe@example.com',
            password: 'password123'
        });
        await createUser({
            displayName: 'Alice User',
            username: 'alice',
            email: 'alice@example.com',
            password: 'password123'
        });

        const response = await agent.get('/api/users?page=1&limit=2');

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            page: 1,
            limit: 2,
            total: 3,
            totalPages: 2
        });
        expect(response.body.users.map((user) => user.username)).toEqual([
            'admin',
            'alice'
        ]);
        expect(response.body.users.every(
            (user) => !Object.hasOwn(user, 'passwordHash')
        )).toBe(true);

        const secondPage = await agent.get('/api/users?page=2&limit=2');
        expect(secondPage.body.users.map((user) => user.username)).toEqual([
            'zoe'
        ]);

        const defaultPage = await agent.get('/api/users');
        expect(defaultPage.body).toMatchObject({
            page: 1,
            limit: 10,
            total: 3,
            totalPages: 1
        });
    });

    test('filters by role and case-insensitive search, escaping regex characters', async () => {
        const agent = await createAndSignIn({
            displayName: 'Admin User',
            username: 'admin',
            email: 'admin@example.com',
            roleName: 'admin'
        });

        await createUser({
            displayName: 'River Person',
            username: 'river',
            email: 'river+special@example.com',
            password: 'password123'
        });
        await createUser({
            displayName: 'Mountain Person',
            username: 'mountain',
            email: 'mountain@example.com',
            password: 'password123'
        });

        const filtered = await agent.get(
            '/api/users?role=user&search=RIVER'
        );
        expect(filtered.status).toBe(200);
        expect(filtered.body).toMatchObject({
            total: 1,
            totalPages: 1
        });
        expect(filtered.body.users[0].username).toBe('river');

        const escaped = await agent.get('/api/users?search=%2B');
        expect(escaped.status).toBe(200);
        expect(escaped.body.users.map((user) => user.username)).toEqual([
            'river'
        ]);
    });

    test('limits regular users to their own account', async () => {
        const agent = await createAndSignIn({
            displayName: 'Regular User',
            username: 'regular',
            email: 'regular@example.com'
        });

        await createUser({
            displayName: 'Other User',
            username: 'other',
            email: 'other@example.com',
            password: 'password123'
        });

        const response = await agent.get('/api/users');

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            total: 1,
            totalPages: 1
        });
        expect(response.body.users.map((user) => user.username)).toEqual([
            'regular'
        ]);
    });

    test('renders the user management page at /users for signed-in users', async () => {
        const agent = await createAndSignIn({
            displayName: 'Admin User',
            username: 'admin',
            email: 'admin@example.com',
            roleName: 'admin'
        });

        const response = await agent.get('/users');

        expect(response.status).toBe(200);
        expect(response.text).toContain('id="users-role-filter"');
        expect(response.text).toContain('id="users-search"');
        expect(response.text).toContain('id="users-previous"');
        expect(response.text).toContain('id="users-next"');
    });

    test.each([
        'page=-1',
        'page=0',
        'limit=abc',
        'page=1.5'
    ])('rejects invalid query parameters: %s', async (query) => {
        const agent = await createAndSignIn({
            displayName: 'Admin User',
            username: 'admin',
            email: 'admin@example.com',
            roleName: 'admin'
        });

        const response = await agent.get(`/api/users?${query}`);

        expect(response.status).toBe(400);
    });
});
