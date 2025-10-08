// backend/tests/routes/huntRoutes.test.js
const request = require('supertest');
const express = require('express');

// The router we’re testing
const huntRoutes = require('../../routes/huntRoutes');

// Controller is used for most endpoints (mock it)
const HuntController = require('../../controllers/huntController');
jest.mock('../../controllers/huntController');

const makeApp = () => {
  const app = express();
  app.use(express.json());
  // This router mounts routes at root like /hunts, /user-hunts, etc.
  app.use('/', huntRoutes);
  return app;
};

describe('Hunt Routes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = makeApp();
  });

  // ────────────────────────────────────────────────────────────────────────────
  // /hunts (CRUD) — pass-through to controller
  // ────────────────────────────────────────────────────────────────────────────
  describe('POST /hunts', () => {
    it('forwards to HuntController.createHunt and returns its result', async () => {
      HuntController.createHunt.mockImplementation((req, res) =>
        res.status(201).json({ message: 'Hunt created', body: req.body })
      );

      const res = await request(app)
        .post('/hunts')
        .send({ name: 'Campus', description: 'd', question: 'q', answer: 'a' });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        message: 'Hunt created',
        body: { name: 'Campus', description: 'd', question: 'q', answer: 'a' },
      });

      expect(HuntController.createHunt).toHaveBeenCalledTimes(1);
      const [reqArg] = HuntController.createHunt.mock.calls[0];
      expect(reqArg.body.name).toBe('Campus');
    });
  });

  describe('GET /hunts', () => {
    it('forwards to HuntController.getHunts and returns its data', async () => {
      HuntController.getHunts.mockImplementation((req, res) => res.json([{ id: 1 }]));

      const res = await request(app).get('/hunts').query({ q: 'abc' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual([{ id: 1 }]);
      expect(HuntController.getHunts).toHaveBeenCalledTimes(1);
      const [reqArg] = HuntController.getHunts.mock.calls[0];
      expect(reqArg.query).toEqual({ q: 'abc' });
    });
  });

  describe('PUT /hunts/:id', () => {
    it('forwards to HuntController.updateHunt with id + body', async () => {
      HuntController.updateHunt.mockImplementation((req, res) =>
        res.json({ ok: true, id: req.params.id, body: req.body })
      );

      const res = await request(app)
        .put('/hunts/42')
        .send({ name: 'Updated' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true, id: '42', body: { name: 'Updated' } });
      expect(HuntController.updateHunt).toHaveBeenCalledTimes(1);
      const [reqArg] = HuntController.updateHunt.mock.calls[0];
      expect(reqArg.params.id).toBe('42');
      expect(reqArg.body).toEqual({ name: 'Updated' });
    });
  });

  describe('DELETE /hunts/:id', () => {
    it('forwards to HuntController.deleteHunt', async () => {
      HuntController.deleteHunt.mockImplementation((req, res) =>
        res.json({ deleted: req.params.id })
      );

      const res = await request(app).delete('/hunts/7');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ deleted: '7' });
      expect(HuntController.deleteHunt).toHaveBeenCalledTimes(1);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // /user-hunts (controller) — GET
  // ────────────────────────────────────────────────────────────────────────────
  describe('GET /user-hunts', () => {
    it('forwards to HuntController.mine and returns its response', async () => {
      HuntController.mine.mockImplementation((req, res) =>
        res.json([{ id: 1, userId: 'u1' }])
      );

      const res = await request(app).get('/user-hunts');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([{ id: 1, userId: 'u1' }]);
      expect(HuntController.mine).toHaveBeenCalledTimes(1);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // /user-hunts/:id (inline handler inside routes file)
  // ────────────────────────────────────────────────────────────────────────────
  describe('GET /user-hunts/:id', () => {
    it('forwards to HuntController.getUserHunt', async () => {
      HuntController.getUserHunt.mockImplementation((req, res) =>
        res.json({ id: req.params.id })
      );

      const res = await request(app).get('/user-hunts/5');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: '5' });
      expect(HuntController.getUserHunt).toHaveBeenCalledTimes(1);
      const [reqArg] = HuntController.getUserHunt.mock.calls[0];
      expect(reqArg.params.id).toBe('5');
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // POST /user-hunts/:id/check (controller)
  // ────────────────────────────────────────────────────────────────────────────
  describe('POST /user-hunts/:id/check', () => {
    it('forwards to HuntController.checkAnswer', async () => {
      HuntController.checkAnswer.mockImplementation((req, res) =>
        res.json({ id: req.params.id, correct: true })
      );

      const res = await request(app)
        .post('/user-hunts/12/check')
        .send({ answer: 'x' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: '12', correct: true });
      expect(HuntController.checkAnswer).toHaveBeenCalledTimes(1);

      const [reqArg] = HuntController.checkAnswer.mock.calls[0];
      expect(reqArg.params.id).toBe('12');
      expect(reqArg.body).toEqual({ answer: 'x' });
    });
  });
});
