// backend/tests/routes/huntRoutes.test.js
const request = require('supertest');
const express = require('express');

// The router we’re testing
const huntRoutes = require('../../routes/huntRoutes');

// Controller is used for most endpoints (mock it)
const HuntController = require('../../controllers/huntController');
jest.mock('../../controllers/huntController');

// The inline route uses sbFromReq; we need to mock it too
const sbFromReqMock = jest.fn();
jest.mock('../../supabase/supabaseFromReq', () => {
  const sbFromReq = jest.fn();
  return { sbFromReq };
});
// Import the mocked fn so tests can control it
const { sbFromReq } = require('../../supabase/supabaseFromReq');

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
  describe('GET /user-hunts/:id (inline route)', () => {
    it('401 when sbFromReq returns null (missing bearer token)', async () => {
      sbFromReq.mockReturnValue(null);;

      const res = await request(app).get('/user-hunts/5');

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ message: 'Missing bearer token' });
      expect(sbFromReqMock).toHaveBeenCalledTimes(1);
    });

    it('400 when id is invalid (NaN or zero)', async () => {
      sbFromReqMock.mockReturnValue({}); // will not be used further

      const res1 = await request(app).get('/user-hunts/abc');
      expect(res1.status).toBe(400);
      expect(res1.body).toEqual({ message: 'Invalid ID' });

      const res2 = await request(app).get('/user-hunts/0');
      expect(res2.status).toBe(400);
      expect(res2.body).toEqual({ message: 'Invalid ID' });
    });

    it('200 returns row when Supabase single() succeeds', async () => {
      // Minimal supabase client mock for the chain: from().select().eq().single()
      const single = jest.fn().mockResolvedValue({
        data: { id: 9, huntId: 2, isActive: true },
        error: null,
      });
      const sbMock = {
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({ single })),
          })),
        })),
      };
      sbFromReq.mockReturnValue(sbMock);

      const res = await request(app)
        .get('/user-hunts/9')
        .set('Authorization', 'Bearer x');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: 9, huntId: 2, isActive: true });

      // Ensure we hit the right table/columns
      expect(sbMock.from).toHaveBeenCalledWith('userHunts');
      expect(single).toHaveBeenCalledTimes(1);
    });

    it('400 when Supabase returns an error from single()', async () => {
      const single = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'no row' },
      });
      const sbMock = {
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({ single })),
          })),
        })),
      };
      sbFromReqMock.mockReturnValue(sbMock);

      const res = await request(app)
        .get('/user-hunts/3')
        .set('Authorization', 'Bearer y');

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: 'no row' });
    });

    it('500 when inline handler throws', async () => {
      // Make .single() reject to exercise the catch block
      const single = jest.fn().mockRejectedValue(new Error('boom'));
      const sbMock = {
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({ single })),
          })),
        })),
      };
      sbFromReqMock.mockReturnValue(sbMock);

      const res = await request(app)
        .get('/user-hunts/4')
        .set('Authorization', 'Bearer z');

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ message: 'boom' });
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
