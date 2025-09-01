// backend/tests/routes/collectiblesRoutes.test.js
const express = require('express');
const request = require('supertest');
const collectiblesRoutes = require('../../routes/collectiblesRoutes');
const ctrl = require('../../controllers/collectiblesController');

// -------------------- MOCKS --------------------
// Mock the Supabase client used in controllers/models
jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({ data: [], error: null }),
      single: jest.fn().mockResolvedValue({ data: {}, error: null }),
    })),
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
    },
  }),
}));

// Mock controller functions (we are testing routes, not DB logic)
jest.mock('../../controllers/collectiblesController');

describe('collectiblesRoutes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/', collectiblesRoutes); // load the real router
  });

  afterEach(() => jest.clearAllMocks());

  it('GET /users/:userId/collectibles calls listUserCollectibles', async () => {
    ctrl.listUserCollectibles.mockImplementation((req, res) =>
      res.json({ ok: true })
    );
    const res = await request(app).get('/users/u1/collectibles');
    expect(ctrl.listUserCollectibles).toHaveBeenCalled();
    expect(res.body).toEqual({ ok: true });
  });

  it('GET /collectibles calls list', async () => {
    ctrl.list.mockImplementation((req, res) => res.json([{ id: 1 }]));
    const res = await request(app).get('/collectibles');
    expect(ctrl.list).toHaveBeenCalled();
    expect(res.body).toEqual([{ id: 1 }]);
  });

  it('GET /collectibles/:id calls getOne', async () => {
    ctrl.getOne.mockImplementation((req, res) => res.json({ id: 1 }));
    const res = await request(app).get('/collectibles/1');
    expect(ctrl.getOne).toHaveBeenCalled();
    expect(res.body).toEqual({ id: 1 });
  });

  it('POST /collectibles calls create', async () => {
    ctrl.create.mockImplementation((req, res) =>
      res.status(201).json({ id: 1 })
    );
    const res = await request(app)
      .post('/collectibles')
      .send({ name: 'Gold' });
    expect(ctrl.create).toHaveBeenCalled();
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 1 });
  });

  it('PATCH /collectibles/:id calls update', async () => {
    ctrl.update.mockImplementation((req, res) =>
      res.json({ id: 1, name: 'Silver' })
    );
    const res = await request(app)
      .patch('/collectibles/1')
      .send({ name: 'Silver' });
    expect(ctrl.update).toHaveBeenCalled();
    expect(res.body).toEqual({ id: 1, name: 'Silver' });
  });

  it('DELETE /collectibles/:id calls remove', async () => {
    ctrl.remove.mockImplementation((req, res) => res.sendStatus(204));
    const res = await request(app).delete('/collectibles/1');
    expect(ctrl.remove).toHaveBeenCalled();
    expect(res.status).toBe(204);
  });
});
