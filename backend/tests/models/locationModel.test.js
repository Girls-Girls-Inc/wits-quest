
global.nextResult = { data: null, error: null }; // what any awaited query resolves to
global.lastQuerySteps = []; // records the last chain of methods/args called

// Mock @supabase/supabase-js createClient => chainable/thenable client
jest.mock('@supabase/supabase-js', () => {
  const createClient = jest.fn(() => {
    const makeChainable = (table) => {
      const steps = [];
      const q = {
        _table: table,
        _steps: steps,
        select(...args) { steps.push(['select', ...args]); return this; },
        order(...args)  { steps.push(['order', ...args]);  return this; },
        ilike(...args)  { steps.push(['ilike', ...args]);  return this; },
        eq(...args)     { steps.push(['eq', ...args]);     return this; },
        update(...args) { steps.push(['update', ...args]); return this; },
        insert(...args) { steps.push(['insert', ...args]); return this; },
        delete(...args) { steps.push(['delete', ...args]); return this; },
        single()        { steps.push(['single']);          return this; },
        maybeSingle()   { steps.push(['maybeSingle']);     return this; },
        then(onFulfilled, onRejected) {
          // expose chain for assertions and resolve using nextResult
          global.lastQuerySteps = steps.slice();
          return Promise.resolve(global.nextResult).then(onFulfilled, onRejected);
        },
      };
      return q;
    };
    return {
      from: (table) => makeChainable(table),
    };
  });

  return { createClient };
});

// Import AFTER mocks are set up
const { createClient } = require('@supabase/supabase-js');

describe('LocationModel', () => {
  // helper to import a fresh copy so module-level admin client is recreated
  const freshModel = () => {
    let Model;
    jest.isolateModules(() => {
      Model = require('../../models/locationModel');
    });
    return Model;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.nextResult = { data: null, error: null };
    global.lastQuerySteps = [];
  });

  // --------------------------
  // getLocations
  // --------------------------
  describe('getLocations', () => {
    it('returns rows and orders by id ASC when no filters provided', async () => {
      const LocationModel = freshModel();

      global.nextResult = {
        data: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }],
        error: null,
      };

      const rows = await LocationModel.getLocations(undefined, undefined);

      expect(rows).toEqual([{ id: 1, name: 'A' }, { id: 2, name: 'B' }]);
      // Confirm select + order chain
      expect(global.lastQuerySteps).toEqual(
        expect.arrayContaining([
          ['select', '*'],
          ['order', 'id', { ascending: true }],
        ])
      );
      // No filters
      expect(global.lastQuerySteps.some(s => s[0] === 'eq')).toBe(false);
      expect(global.lastQuerySteps.some(s => s[0] === 'ilike')).toBe(false);

      // Only the admin client created at module import
      expect(createClient).toHaveBeenCalledTimes(1);
    });

    it('applies id and name filters (eq + ilike)', async () => {
      const LocationModel = freshModel();
      global.nextResult = { data: [], error: null };

      await LocationModel.getLocations(42, 'Campus');

      expect(global.lastQuerySteps).toEqual(
        expect.arrayContaining([
          ['select', '*'],
          ['order', 'id', { ascending: true }],
          ['eq', 'id', 42],
          ['ilike', 'name', '%Campus%'],
        ])
      );
    });

    it('throws when the select returns an error', async () => {
      const LocationModel = freshModel();
      global.nextResult = { data: null, error: { message: 'db error' } };

      await expect(LocationModel.getLocations()).rejects.toEqual({ message: 'db error' });
    });
  });

  // --------------------------
  // getLocationById
  // --------------------------
  describe('getLocationById', () => {
    it('returns a single row on success', async () => {
      const LocationModel = freshModel();
      global.nextResult = { data: { id: 9, name: 'Gate' }, error: null };

      const row = await LocationModel.getLocationById(9);

      expect(row).toEqual({ id: 9, name: 'Gate' });
      expect(global.lastQuerySteps).toEqual(
        expect.arrayContaining([
          ['select', '*'],
          ['eq', 'id', 9],
          ['single'],
        ])
      );
    });

    it('throws when single() reports an error', async () => {
      const LocationModel = freshModel();
      global.nextResult = { data: null, error: { message: 'not found' } };

      await expect(LocationModel.getLocationById(123)).rejects.toEqual({ message: 'not found' });
    });
  });

  // --------------------------
  // createLocation
  // --------------------------
  describe('createLocation', () => {
    it('inserts payload and returns inserted row; uses anon client when token present', async () => {
      const LocationModel = freshModel();
      const payload = { name: 'Lib', latitude: 1.2, longitude: 3.4, radius: 50 };

      global.nextResult = { data: { id: 7, ...payload }, error: null };

      const out = await LocationModel.createLocation(payload, { token: 'abc' });

      expect(out).toEqual({ id: 7, ...payload });
      expect(global.lastQuerySteps).toEqual(
        expect.arrayContaining([
          ['insert', payload],
          ['select'],
          ['single'],
        ])
      );
      // admin (module import) + anon (from token) => 2
      expect(createClient).toHaveBeenCalledTimes(2);
    });

    it('throws when insert returns an error', async () => {
      const LocationModel = freshModel();
      global.nextResult = { data: null, error: { message: 'insert fail' } };

      await expect(
        LocationModel.createLocation({ name: 'X', latitude: 1, longitude: 2, radius: 3 }, { token: 't' })
      ).rejects.toEqual({ message: 'insert fail' });
    });
  });

  // --------------------------
  // updateLocation
  // --------------------------
  describe('updateLocation', () => {
    it('updates and returns the row (maybeSingle path)', async () => {
      const LocationModel = freshModel();
      const updates = { name: 'New', latitude: 10, longitude: 20, radius: 30 };

      global.nextResult = { data: { id: 12, ...updates }, error: null };

      const out = await LocationModel.updateLocation(12, updates);

      expect(out).toEqual({ id: 12, ...updates });
      expect(global.lastQuerySteps).toEqual(
        expect.arrayContaining([
          ['update', updates],
          ['eq', 'id', 12],
          ['select'],
          ['maybeSingle'],
        ])
      );
    });

    it('throws 404 when maybeSingle returns no data and no error', async () => {
      const LocationModel = freshModel();
      global.nextResult = { data: null, error: null }; // triggers "Location not found"

      await expect(LocationModel.updateLocation(99, { name: 'X' }))
        .rejects.toMatchObject({ message: 'Location not found', status: 404 });
    });

    it('throws when update returns an error', async () => {
      const LocationModel = freshModel();
      global.nextResult = { data: null, error: { message: 'update fail' } };

      await expect(LocationModel.updateLocation(1, { name: 'X' }))
        .rejects.toEqual({ message: 'update fail' });
    });
  });

  // --------------------------
  // deleteLocation
  // --------------------------
  describe('deleteLocation', () => {
    it('returns { error: null } on success', async () => {
      const LocationModel = freshModel();
      global.nextResult = { data: null, error: null };

      const res = await LocationModel.deleteLocation(55);

      expect(res).toEqual({ error: null });
      expect(global.lastQuerySteps).toEqual(
        expect.arrayContaining([
          ['delete'],
          ['eq', 'id', 55],
        ])
      );
    });

    it('returns { error } when delete fails', async () => {
      const LocationModel = freshModel();
      const err = { message: 'cannot delete' };
      global.nextResult = { data: null, error: err };

      const res = await LocationModel.deleteLocation(55);

      expect(res).toEqual({ error: err });
    });
  });

  // --------------------------
  // pick() behavior smoke checks
  // --------------------------
  describe('client selection via pick()', () => {
    it('uses admin client when sbOrOpts not provided', async () => {
      const LocationModel = freshModel();
      global.nextResult = { data: [], error: null };

      await LocationModel.getLocations();

      // Only the admin client created at module import
      expect(createClient).toHaveBeenCalledTimes(1);
    });

    it('creates anon client when sbOrOpts is a token string', async () => {
      const LocationModel = freshModel();
      global.nextResult = { data: { id: 1 }, error: null };

      await LocationModel.createLocation(
        { name: 'X', latitude: 1, longitude: 2, radius: 3 },
        'bearer-token'
      );

      // admin + anon
      expect(createClient).toHaveBeenCalledTimes(2);
    });

    it('accepts a Supabase-like client (has .from) and does not create another client', async () => {
      // Fake client with minimal chain & resolver
      const steps = [];
      const fakeClient = {
        from: () => ({
          select(...a){ steps.push(['select', ...a]); return this; },
          order(...a){ steps.push(['order', ...a]);  return this; },
          then(onF){ global.lastQuerySteps = steps.slice(); return Promise.resolve({ data: [], error: null }).then(onF); },
        }),
      };

      const LocationModel = freshModel();
      const rows = await LocationModel.getLocations(undefined, undefined, fakeClient);

      expect(rows).toEqual([]);
      // No extra client beyond admin-at-import
      expect(createClient).toHaveBeenCalledTimes(1);

      expect(global.lastQuerySteps).toEqual(
        expect.arrayContaining([
          ['select', '*'],
          ['order', 'id', { ascending: true }],
        ])
      );
    });
  });
});
