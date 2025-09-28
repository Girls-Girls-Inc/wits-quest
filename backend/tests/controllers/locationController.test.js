const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

// ---- Mocks ----
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

jest.mock('../../models/locationModel', () => ({
  getLocations: jest.fn(),
  getLocationById: jest.fn(),
  createLocation: jest.fn(),
  updateLocation: jest.fn(),
  deleteLocation: jest.fn(),
}));

// tiny postgrest-like builder per table
const makePostgrestBuilder = (behaviors, table) => {
  const b = {
    _table: table,
    _insertRows: null,
    select: jest.fn(() => b),
    ilike: jest.fn(() => b),
    eq: jest.fn(() => b),
    limit: jest.fn(() =>
      Promise.resolve(behaviors[table]?.selectResult ?? { data: [], error: null })
    ),
    maybeSingle: jest.fn(() =>
      Promise.resolve(behaviors[table]?.maybeSingleResult ?? { data: null, error: null })
    ),
    insert: jest.fn((rows) => {
      b._insertRows = rows;
      return b;
    }),
    single: jest.fn(() =>
      Promise.resolve(behaviors[table]?.insertResult ?? { data: { id: 1 }, error: null })
    ),
  };
  return b;
};

const makeSupabaseClient = (behaviors = {}) => ({
  from: jest.fn((table) => makePostgrestBuilder(behaviors, table)),
  auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u-123' } } }) },
});

describe('LocationController', () => {
  let LocationController;
  let LocationModel;
  let createClient;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    process.env.THRIFT_API_BASE = 'https://example.com';
    process.env.SUPABASE_URL = 'https://supabase.test';
    process.env.SUPABASE_ANON_KEY = 'anon';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
    process.env.SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001';

    // default external API response
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          storeId: 's1',
          storeName: 'Vintage Vibes',
          address: '123 Main',
          description: 'Great finds',
          location: { lat: -26.2, lng: 28.04 },
        },
        {
          storeId: 's2',
          storeName: 'Retro Rack',
          address: '456 High',
          description: 'More finds',
          location: { lat: -26.21, lng: 28.05 },
        },
      ],
    });

    createClient = require('@supabase/supabase-js').createClient;
    LocationModel = require('../../models/locationModel');

    // default supabase client: no existing locations; ensureQuest finds existing (so no double-insert)
    createClient.mockReturnValue(
      makeSupabaseClient({
        locations: { selectResult: { data: [], error: null } },
        quests: { maybeSingleResult: { data: { id: 999 }, error: null } },
      })
    );

    LocationController = require('../../controllers/locationController');
  });

  // ─────────────────────────────── importThriftToDb (core)
  describe('importThriftToDb', () => {
    const authHeader = { authorization: 'Bearer test-token' };

    it('401 when no bearer token', async () => {
      const req = { headers: {}, query: {} };
      const res = makeRes();
      await LocationController.importThriftToDb(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing Authorization Bearer token' });
    });

    it('dryRun returns preview and does not write', async () => {
      const req = { headers: authHeader, query: { dryRun: 'true' } };
      const res = makeRes();

      await LocationController.importThriftToDb(req, res);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/external/stores'),
        expect.any(Object)
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          dryRun: true,
          storesProcessed: 2,
          sampleLocations: expect.any(Array),
        })
      );
      expect(LocationModel.createLocation).not.toHaveBeenCalled();
    });

    it('happy path: creates locations + quests; sets lastSync', async () => {
      LocationModel.createLocation
        .mockResolvedValueOnce({ id: 10 })
        .mockResolvedValueOnce({ id: 11 });

      const req = { headers: authHeader, query: {} };
      const res = makeRes();
      await LocationController.importThriftToDb(req, res);

      expect(LocationModel.createLocation).toHaveBeenCalledTimes(2);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          storesProcessed: 2,
          createdLocations: 2,
          skippedExisting: 0,
          // questsCreated counts the immediate createQuestForLocation per store
          questsCreated: 2,
          lastSync: expect.any(Number),
        })
      );
    });

    it('skips second call while inflight', async () => {
      // stall fetch until released
      let release;
      global.fetch = jest.fn(
        () =>
          new Promise((resolve) => {
            release = () =>
              resolve({
                ok: true,
                json: async () => [
                  { storeId: 's1', storeName: 'Vintage Vibes', location: { lat: 1, lng: 2 } },
                ],
              });
          })
      );

      const req1 = { headers: authHeader, query: {} };
      const res1 = makeRes();
      const p1 = LocationController.importThriftToDb(req1, res1);

      const req2 = { headers: authHeader, query: {} };
      const res2 = makeRes();
      const p2 = LocationController.importThriftToDb(req2, res2);

      release();
      await Promise.all([p1, p2]);

      expect(res2.json).toHaveBeenCalledWith(
        expect.objectContaining({ ok: true, skipped: 'inflight', lastSync: expect.any(Number) })
      );
    });

    it('skips when fresh (TTL) but runs when syncIfStale=false', async () => {
      LocationModel.createLocation.mockResolvedValue({ id: 10 });

      const req1 = { headers: authHeader, query: {} };
      const res1 = makeRes();
      await LocationController.importThriftToDb(req1, res1);

      // fresh → skip
      const req2 = { headers: authHeader, query: { syncIfStale: 'true' } };
      const res2 = makeRes();
      await LocationController.importThriftToDb(req2, res2);
      expect(res2.json).toHaveBeenCalledWith(
        expect.objectContaining({ ok: true, skipped: 'fresh', lastSync: expect.any(Number) })
      );

      // force run even if fresh
      const req3 = { headers: authHeader, query: { syncIfStale: 'false' } };
      const res3 = makeRes();
      await LocationController.importThriftToDb(req3, res3);
      expect(global.fetch).toHaveBeenCalledTimes(2); // second run happened
    });

    it('applies name filter', async () => {
      LocationModel.createLocation.mockResolvedValue({ id: 10 });
      const req = { headers: authHeader, query: { name: 'vintage' } };
      const res = makeRes();
      await LocationController.importThriftToDb(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ storesProcessed: 1 }));
    });

    it('passes defaultRadius to createLocation payload', async () => {
      LocationModel.createLocation.mockResolvedValue({ id: 10 });
      const req = { headers: authHeader, query: { defaultRadius: '123' } };
      const res = makeRes();
      await LocationController.importThriftToDb(req, res);
      expect(LocationModel.createLocation).toHaveBeenCalledWith(
        expect.objectContaining({ radius: 123 }),
        { token: 'test-token' }
      );
    });

    it('dedupes when existing location within threshold', async () => {
      // First mock client: locations.select returns an existing row at same coords
      createClient.mockReturnValueOnce(
        makeSupabaseClient({
          locations: {
            selectResult: {
              data: [{ id: 77, name: 'Vintage Vibes', latitude: -26.2, longitude: 28.04 }],
              error: null,
            },
          },
          quests: { maybeSingleResult: { data: { id: 500 }, error: null } },
        })
      );

      LocationModel.createLocation.mockResolvedValue({ id: 99 }); // at least one will still be created

      const req = { headers: authHeader, query: {} };
      const res = makeRes();
      await LocationController.importThriftToDb(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          createdLocations: expect.any(Number),
          skippedExisting: expect.any(Number),
        })
      );
    });

    it('ignores stores without lat/lng', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { storeId: 'bad', storeName: 'No Coords', location: {} },
          { storeId: 'ok', storeName: 'Good', location: { lat: 1, lng: 2 } },
        ],
      });
      LocationModel.createLocation.mockResolvedValue({ id: 55 });

      const req = { headers: authHeader, query: {} };
      const res = makeRes();
      await LocationController.importThriftToDb(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ storesProcessed: 2, createdLocations: 1 })
      );
    });

    it('401 when Authorization is "Bearer undefined"', async () => {
      const req = { headers: { authorization: 'Bearer undefined' }, query: {} };
      const res = makeRes();
      await LocationController.importThriftToDb(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('500 when external API not ok', async () => {
      global.fetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });
      const req = { headers: authHeader, query: {} };
      const res = makeRes();
      await LocationController.importThriftToDb(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Thrift API HTTP 500' });
    });

    it('500 when createLocation throws', async () => {
      LocationModel.createLocation.mockRejectedValue(new Error('insert fail'));
      const req = { headers: authHeader, query: {} };
      const res = makeRes();
      await LocationController.importThriftToDb(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'insert fail' });
    });
  });

  // ─────────────────────────────── getLocations
  describe('getLocations', () => {
    it('200 normalizes rows', async () => {
      LocationModel.getLocations.mockResolvedValue([
        { id: 1, latitude: -26.1, longitude: 28.1, radius: 25 },
        { id: 2, lat: -26.2, lng: 28.2, radiusMeters: 40 },
      ]);
      const req = { query: {} };
      const res = makeRes();
      await LocationController.getLocations(req, res);

      expect(LocationModel.getLocations).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith([
        { id: 1, latitude: -26.1, longitude: 28.1, radius: 25, lat: -26.1, lng: 28.1 },
        { id: 2, lat: -26.2, lng: 28.2, radiusMeters: 40, radius: 40 },
      ]);
    });

    it('normalizes non-numeric coords/radius to 0', async () => {
      LocationModel.getLocations.mockResolvedValue([{ id: 1, lat: 'x', lng: null, radius: 'y' }]);
      const req = { query: {} };
      const res = makeRes();
      await LocationController.getLocations(req, res);
      expect(res.json).toHaveBeenCalledWith([{ id: 1, lat: 0, lng: 0, radius: 0 }]);
    });

    it('500 on model error', async () => {
      LocationModel.getLocations.mockRejectedValue(new Error('db fail'));
      const req = { query: {} };
      const res = makeRes();
      await LocationController.getLocations(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'db fail' });
    });
  });

  // ─────────────────────────────── getLocationById
  describe('getLocationById', () => {
    it('404 when not found', async () => {
      LocationModel.getLocationById.mockResolvedValue(null);
      const req = { params: { id: '7' } };
      const res = makeRes();
      await LocationController.getLocationById(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Location 7 not found' });
    });

    it('200 normalizes a single row', async () => {
      LocationModel.getLocationById.mockResolvedValue({
        id: 3,
        latitude: -26.3,
        longitude: 28.3,
        radius: 15,
      });
      const req = { params: { id: '3' } };
      const res = makeRes();
      await LocationController.getLocationById(req, res);
      expect(res.json).toHaveBeenCalledWith({
        id: 3,
        latitude: -26.3,
        longitude: 28.3,
        radius: 15,
        lat: -26.3,
        lng: 28.3,
      });
    });

    it('500 when model throws', async () => {
      LocationModel.getLocationById.mockRejectedValue(new Error('boom'));
      const req = { params: { id: '9' } };
      const res = makeRes();
      await LocationController.getLocationById(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'boom' });
    });
  });

  // ─────────────────────────────── createLocation
  describe('createLocation', () => {
    it('401 without token', async () => {
      const req = { headers: {}, body: {} };
      const res = makeRes();
      await LocationController.createLocation(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing Authorization Bearer token' });
    });

    it('400 invalid payload', async () => {
      const req = { headers: { authorization: 'Bearer x' }, body: { name: 'A' } };
      const res = makeRes();
      await LocationController.createLocation(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid latitude/longitude/radius' });
    });

    it('201 success (aliases supported)', async () => {
      LocationModel.createLocation.mockResolvedValue({ id: 42, name: 'A' });
      const req = {
        headers: { authorization: 'Bearer x' },
        body: { name: 'A', latitude: -1, longitude: 2, radiusMeters: 50 },
      };
      const res = makeRes();
      await LocationController.createLocation(req, res);
      expect(LocationModel.createLocation).toHaveBeenCalledWith(
        { name: 'A', latitude: -1, longitude: 2, radius: 50 },
        { token: 'x' }
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ id: 42, name: 'A' });
    });

    it('500 on model error', async () => {
      LocationModel.createLocation.mockRejectedValue(new Error('fail'));
      const req = {
        headers: { authorization: 'Bearer x' },
        body: { name: 'A', lat: -1, lng: 2, radius: 50 },
      };
      const res = makeRes();
      await LocationController.createLocation(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'fail' });
    });
  });

  // ─────────────────────────────── updateLocation
  describe('updateLocation', () => {
    it('401 without token', async () => {
      const req = { headers: {}, params: { id: '5' }, body: {} };
      const res = makeRes();
      await LocationController.updateLocation(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('400 invalid id', async () => {
      const req = { headers: { authorization: 'Bearer x' }, params: { id: 'abc' }, body: {} };
      const res = makeRes();
      await LocationController.updateLocation(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid id' });
    });

    it('400 when no valid fields', async () => {
      const req = { headers: { authorization: 'Bearer x' }, params: { id: '9' }, body: {} };
      const res = makeRes();
      await LocationController.updateLocation(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'No valid fields to update' });
    });

    it('200 success', async () => {
      LocationModel.updateLocation.mockResolvedValue({ id: 9, name: 'B' });
      const req = {
        headers: { authorization: 'Bearer x' },
        params: { id: '9' },
        body: { name: 'B' },
      };
      const res = makeRes();
      await LocationController.updateLocation(req, res);
      expect(LocationModel.updateLocation).toHaveBeenCalledWith(9, { name: 'B' }, { token: 'x' });
      expect(res.json).toHaveBeenCalledWith({ id: 9, name: 'B' });
    });

    it('403 when RLS error surfaces', async () => {
      LocationModel.updateLocation.mockRejectedValue(new Error('row-level security violation'));
      const req = {
        headers: { authorization: 'Bearer x' },
        params: { id: '9' },
        body: { name: 'B' },
      };
      const res = makeRes();
      await LocationController.updateLocation(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('404 when model signals not found', async () => {
      const err = new Error('no row');
      err.status = 404;
      LocationModel.updateLocation.mockRejectedValue(err);
      const req = {
        headers: { authorization: 'Bearer x' },
        params: { id: '9' },
        body: { name: 'B' },
      };
      const res = makeRes();
      await LocationController.updateLocation(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Location not found' });
    });

    it('400 on other errors', async () => {
      LocationModel.updateLocation.mockRejectedValue(new Error('random failure'));
      const req = {
        headers: { authorization: 'Bearer x' },
        params: { id: '2' },
        body: { name: 'Z' },
      };
      const res = makeRes();
      await LocationController.updateLocation(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'random failure' });
    });
  });

  // ─────────────────────────────── deleteLocation
  describe('deleteLocation', () => {
    it('401 without token', async () => {
      const req = { headers: {}, params: { id: '1' } };
      const res = makeRes();
      await LocationController.deleteLocation(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('204 on success', async () => {
      LocationModel.deleteLocation.mockResolvedValue({ error: null });
      const req = { headers: { authorization: 'Bearer x' }, params: { id: '1' } };
      const res = makeRes();
      await LocationController.deleteLocation(req, res);
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    it('400 on model error', async () => {
      LocationModel.deleteLocation.mockResolvedValue({ error: { message: 'bad' } });
      const req = { headers: { authorization: 'Bearer x' }, params: { id: '1' } };
      const res = makeRes();
      await LocationController.deleteLocation(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'bad' });
    });

    it('500 when model throws', async () => {
      LocationModel.deleteLocation.mockRejectedValue(new Error('delete crash'));
      const req = { headers: { authorization: 'Bearer x' }, params: { id: '1' } };
      const res = makeRes();
      await LocationController.deleteLocation(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'delete crash' });
    });
  });
});

