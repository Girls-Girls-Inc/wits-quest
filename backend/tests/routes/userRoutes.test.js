// backend/tests/routes/userRoutes.test.js
const express = require('express');
const request = require('supertest');
const userRoutes = require('../../routes/userRoutes'); // ✅ corrected path

// Mock the controller
jest.mock('../../controllers/userController', () => ({
  getAllUsers: jest.fn((req, res) => res.json([{ userId: '123' }])),
  getUserById: jest.fn((req, res) => res.json({ userId: req.params.id })),
  patchUser: jest.fn((req, res) => res.json({ userId: req.params.id, ...req.body })),
}));

const UserController = require('../../controllers/userController');

describe('userRoutes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/', userRoutes); // mount the router
  });

  it('GET /users should call getAllUsers', async () => {
    const res = await request(app).get('/users');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(UserController.getAllUsers).toHaveBeenCalled();
  });

  it('GET /users/:id should call getUserById', async () => {
    const res = await request(app).get('/users/abc');
    expect(res.status).toBe(200);
    expect(res.body.userId).toBe('abc');
    expect(UserController.getUserById).toHaveBeenCalled();
  });

  it('PATCH /users/:id should call patchUser', async () => {
    const res = await request(app).patch('/users/xyz').send({ isModerator: true });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ userId: 'xyz', isModerator: true });
    expect(UserController.patchUser).toHaveBeenCalled();
  });
});
