const HuntController = require('../../controllers/huntController');
const HuntModel = require('../../models/huntModel');

jest.mock('../../models/huntModel');

function mockReqRes({ params = {}, query = {}, body = {}, headers = {} } = {}) {
  const req = { params, query, body, headers };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    sendStatus: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };
  return { req, res };
}

describe('HuntController', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  /* ====================== createHunt (POST /hunts) ====================== */
  describe('createHunt', () => {
    it('400 when required fields are missing', async () => {
      const { req, res } = mockReqRes({ body: {} });

      await HuntController.createHunt(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Missing required fields' });
      expect(HuntModel.createHunt).not.toHaveBeenCalled();
    });

    it('201 on success and returns created hunt (data[0])', async () => {
      const now = new Date('2025-01-01T00:00:00.000Z');
      jest.spyOn(global, 'Date').mockImplementation(() => now);

      const input = {
        name: 'Campus Quest',
        description: 'Find markers around campus',
        question: 'What is the mascot?',
        answer: 'Witsie',
        timeLimit: '300', // will be parsed to number
      };

      HuntModel.createHunt.mockResolvedValue({
        data: [{ id: 10, ...input, timeLimit: 300, created_at: now.toISOString() }],
        error: null,
      });

      const { req, res } = mockReqRes({ body: input });

      await HuntController.createHunt(req, res);

      expect(HuntModel.createHunt).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Campus Quest',
          description: 'Find markers around campus',
          question: 'What is the mascot?',
          answer: 'Witsie',
          timeLimit: 300,
          created_at: now.toISOString(),
        })
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Hunt created successfully',
        hunt: { id: 10, ...input, timeLimit: 300, created_at: now.toISOString() },
      });

      global.Date.mockRestore();
    });

    it('sets timeLimit to null when absent or invalid', async () => {
      HuntModel.createHunt.mockResolvedValue({
        data: [{ id: 11, name: 'Hunt', description: 'd', question: 'q', answer: 'a', timeLimit: null }],
        error: null,
      });

      const { req, res } = mockReqRes({
        body: { name: 'Hunt', description: 'd', question: 'q', answer: 'a', timeLimit: 'abc' }, // invalid
      });

      await HuntController.createHunt(req, res);

      expect(HuntModel.createHunt).toHaveBeenCalledWith(
        expect.objectContaining({ timeLimit: null })
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          hunt: expect.objectContaining({ id: 11, timeLimit: null }),
        })
      );
    });

    it('500 when model returns error', async () => {
      HuntModel.createHunt.mockResolvedValue({
        data: null,
        error: { message: 'DB error' },
      });

      const { req, res } = mockReqRes({
        body: { name: 'H', description: 'd', question: 'q', answer: 'a' },
      });

      await HuntController.createHunt(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'DB error' });
    });

    it('500 on unexpected exception', async () => {
      HuntModel.createHunt.mockRejectedValue(new Error('boom'));

      const { req, res } = mockReqRes({
        body: { name: 'H', description: 'd', question: 'q', answer: 'a' },
      });

      await HuntController.createHunt(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'boom' });
    });
  });

  /* ======================== getHunts (GET /hunts) ======================= */
  describe('getHunts', () => {
    it('returns hunts array and passes query as filter', async () => {
      const sample = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }];
      HuntModel.getHunts.mockResolvedValue({ data: sample, error: null });

      const { req, res } = mockReqRes({ query: { name: 'A', limit: '10' } });

      await HuntController.getHunts(req, res);

      expect(HuntModel.getHunts).toHaveBeenCalledWith({ name: 'A', limit: '10' });
      expect(res.json).toHaveBeenCalledWith(sample);
    });

    it('500 when model returns error', async () => {
      HuntModel.getHunts.mockResolvedValue({ data: null, error: { message: 'read failed' } });

      const { req, res } = mockReqRes({ query: {} });

      await HuntController.getHunts(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'read failed' });
    });

    it('500 on unexpected exception', async () => {
      HuntModel.getHunts.mockRejectedValue(new Error('boom'));

      const { req, res } = mockReqRes();

      await HuntController.getHunts(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'boom' });
    });
  });

  /* ===================== updateHunt (PUT /hunts/:id) ===================== */
  describe('updateHunt', () => {
    it('400 when id is invalid', async () => {
      const { req, res } = mockReqRes({ params: { id: 'abc' }, body: {} });

      await HuntController.updateHunt(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Hunt ID is invalid' });
      expect(HuntModel.updateHunt).not.toHaveBeenCalled();
    });

    it('parses timeLimit to number when valid', async () => {
      HuntModel.updateHunt.mockResolvedValue({
        data: [{ id: 5, name: 'X', timeLimit: 120 }],
        error: null,
      });

      const { req, res } = mockReqRes({
        params: { id: '5' },
        body: { timeLimit: '120', name: 'X' },
      });

      await HuntController.updateHunt(req, res);

      expect(HuntModel.updateHunt).toHaveBeenCalledWith(5, { timeLimit: 120, name: 'X' });
      expect(res.json).toHaveBeenCalledWith({
        message: 'Hunt updated successfully',
        hunt: { id: 5, name: 'X', timeLimit: 120 },
      });
    });

    it('sets timeLimit to null when missing/empty/NaN', async () => {
      HuntModel.updateHunt.mockResolvedValue({
        data: [{ id: 6, name: 'Y', timeLimit: null }],
        error: null,
      });

      const { req, res } = mockReqRes({
        params: { id: '6' },
        body: { timeLimit: '', name: 'Y' }, // empty -> null
      });

      await HuntController.updateHunt(req, res);

      expect(HuntModel.updateHunt).toHaveBeenCalledWith(6, { timeLimit: null, name: 'Y' });
      expect(res.json).toHaveBeenCalledWith({
        message: 'Hunt updated successfully',
        hunt: { id: 6, name: 'Y', timeLimit: null },
      });
    });

    it('500 when model returns error', async () => {
      HuntModel.updateHunt.mockResolvedValue({ data: null, error: { message: 'update failed' } });

      const { req, res } = mockReqRes({
        params: { id: '7' },
        body: { name: 'Z' },
      });

      await HuntController.updateHunt(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'update failed' });
    });

    it('500 on unexpected exception', async () => {
      HuntModel.updateHunt.mockRejectedValue(new Error('boom'));

      const { req, res } = mockReqRes({
        params: { id: '7' },
        body: { name: 'Z' },
      });

      await HuntController.updateHunt(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'boom' });
    });
  });

  /* ==================== deleteHunt (DELETE /hunts/:id) =================== */
  describe('deleteHunt', () => {
    it('400 when id is missing/invalid', async () => {
      const { req, res } = mockReqRes({ params: { id: 'abc' } });

      await HuntController.deleteHunt(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Hunt ID is required' });
      expect(HuntModel.deleteHunt).not.toHaveBeenCalled();
    });

    it('returns success message and deleted hunt (data[0])', async () => {
      HuntModel.deleteHunt.mockResolvedValue({
        data: [{ id: 9, name: 'Old Hunt' }],
        error: null,
      });

      const { req, res } = mockReqRes({ params: { id: '9' } });

      await HuntController.deleteHunt(req, res);

      expect(HuntModel.deleteHunt).toHaveBeenCalledWith(9);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Hunt deleted successfully',
        hunt: { id: 9, name: 'Old Hunt' },
      });
    });

    it('500 when model returns error', async () => {
      HuntModel.deleteHunt.mockResolvedValue({ data: null, error: { message: 'delete failed' } });

      const { req, res } = mockReqRes({ params: { id: '2' } });

      await HuntController.deleteHunt(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'delete failed' });
    });

    it('500 on unexpected exception', async () => {
      HuntModel.deleteHunt.mockRejectedValue(new Error('boom'));

      const { req, res } = mockReqRes({ params: { id: '2' } });

      await HuntController.deleteHunt(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'boom' });
    });
  });
});
