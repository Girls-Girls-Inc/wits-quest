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

describe('HuntModel', () => {
  // helper to import a fresh copy so module-level admin client is recreated
  const freshModel = () => {
    let Model;
    jest.isolateModules(() => {
      Model = require('../../models/huntModel'); // << your HuntModel path
    });
    return Model;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.nextResult = { data: null, error: null };
    global.lastQuerySteps = [];
  });

  /* --------------------------
   * createHunt
   * ------------------------ */
  describe('createHunt', () => {
    it('inserts [payload] and selects; returns {data, error}', async () => {
      const HuntModel = freshModel();

      const payload = { name: 'Campus Hunt', description: 'desc', question: 'Q', answer: 'A' };
      const result = { data: [{ id: 1, ...payload }], error: null };
      global.nextResult = result;

      const out = await HuntModel.createHunt(payload);

      expect(out).toEqual(result);
      // Note: model calls insert([payload]) then select()
      expect(global.lastQuerySteps).toEqual(
        expect.arrayContaining([
          ['insert', [payload]],
          ['select'], // no args
        ])
      );
      // Only the admin client created at module import
      expect(createClient).toHaveBeenCalledTimes(1);
    });

    it('passes through Supabase error', async () => {
      const HuntModel = freshModel();

      const err = { message: 'insert failed' };
      global.nextResult = { data: null, error: err };

      const out = await HuntModel.createHunt({ name: 'X', description: 'd', question: 'q', answer: 'a' });
      expect(out).toEqual({ data: null, error: err });
    });
  });

  /* --------------------------
   * getHunts
   * ------------------------ */
  describe('getHunts', () => {
    it('selects * without filters when filter empty; returns {data, error}', async () => {
      const HuntModel = freshModel();

      const result = { data: [{ id: 1 }, { id: 2 }], error: null };
      global.nextResult = result;

      const out = await HuntModel.getHunts({});

      expect(out).toEqual(result);
      expect(global.lastQuerySteps).toEqual(
        expect.arrayContaining([
          ['select', '*'],
        ])
      );
      // No filters were applied
      expect(global.lastQuerySteps.some(s => s[0] === 'eq')).toBe(false);
      expect(global.lastQuerySteps.some(s => s[0] === 'ilike')).toBe(false);
      expect(createClient).toHaveBeenCalledTimes(1);
    });

    it('applies id and name filters (eq + ilike)', async () => {
      const HuntModel = freshModel();

      global.nextResult = { data: [], error: null };

      await HuntModel.getHunts({ id: 42, name: 'Treasure' });

      expect(global.lastQuerySteps).toEqual(
        expect.arrayContaining([
          ['select', '*'],
          ['eq', 'id', 42],
          ['ilike', 'name', '%Treasure%'],
        ])
      );
    });

    it('passes through error from select', async () => {
      const HuntModel = freshModel();
      const err = { message: 'db error' };
      global.nextResult = { data: null, error: err };

      const out = await HuntModel.getHunts();
      expect(out).toEqual({ data: null, error: err });
    });
  });

  /* --------------------------
   * updateHunt
   * ------------------------ */
  describe('updateHunt', () => {
    it('updates by id, eq(id), select(); returns {data, error}', async () => {
      const HuntModel = freshModel();

      const updates = { name: 'Updated', description: 'd2' };
      const result = { data: [{ id: 9, ...updates }], error: null };
      global.nextResult = result;

      const out = await HuntModel.updateHunt(9, updates);

      expect(out).toEqual(result);
      expect(global.lastQuerySteps).toEqual(
        expect.arrayContaining([
          ['update', updates],
          ['eq', 'id', 9],
          ['select'], // no args
        ])
      );
      expect(createClient).toHaveBeenCalledTimes(1);
    });

    it('passes through error from update', async () => {
      const HuntModel = freshModel();
      const err = { message: 'update failed' };
      global.nextResult = { data: null, error: err };

      const out = await HuntModel.updateHunt(1, { name: 'X' });
      expect(out).toEqual({ data: null, error: err });
    });
  });

  /* --------------------------
   * deleteHunt
   * ------------------------ */
  describe('deleteHunt', () => {
    it('deletes by id, eq(id), select(); returns {data, error}', async () => {
      const HuntModel = freshModel();

      const result = { data: [{ id: 7 }], error: null };
      global.nextResult = result;

      const out = await HuntModel.deleteHunt(7);

      expect(out).toEqual(result);
      expect(global.lastQuerySteps).toEqual(
        expect.arrayContaining([
          ['delete'],
          ['eq', 'id', 7],
          ['select'], // no args
        ])
      );
      expect(createClient).toHaveBeenCalledTimes(1);
    });

    it('passes through error from delete', async () => {
      const HuntModel = freshModel();
      const err = { message: 'cannot delete' };
      global.nextResult = { data: null, error: err };

      const out = await HuntModel.deleteHunt(55);
      expect(out).toEqual({ data: null, error: err });
    });
  });
});

