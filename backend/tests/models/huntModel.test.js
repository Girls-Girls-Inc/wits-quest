// tests/models/huntModel.test.js

global.nextResult = { data: null, error: null };
global.lastQuerySteps = [];

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
        maybeSingle()   { steps.push(['maybeSingle']);      return this; },
        then(onFulfilled, onRejected) {
          global.lastQuerySteps = steps.slice();
          return Promise.resolve(global.nextResult).then(onFulfilled, onRejected);
        },
      };
      return q;
    };
    return { from: (table) => makeChainable(table) };
  });

  return { createClient };
});

const freshModel = () => {
  let Model;
  jest.isolateModules(() => {
    Model = require('../../models/huntModel');
  });
  return Model;
};

describe('HuntModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.nextResult = { data: null, error: null };
    global.lastQuerySteps = [];
  });

  describe('createHunt', () => {
    it('inserts payload and returns data', async () => {
      const HuntModel = freshModel();
      const payload = { name: 'Campus Hunt', description: 'desc', question: 'Q', answer: 'A', pointsAchievable: '5' };
      const result = { data: [{ id: 1, ...payload, pointsAchievable: 5 }], error: null };
      global.nextResult = result;

      const out = await HuntModel.createHunt(payload);

      expect(out).toEqual(result);
      expect(global.lastQuerySteps).toEqual(
        expect.arrayContaining([
          ['insert', [expect.objectContaining({ name: 'Campus Hunt' })]],
          ['select'],
        ])
      );
    });

    it('coerces non-numeric pointsAchievable to 0', async () => {
      const HuntModel = freshModel();
      const payload = { pointsAchievable: 'abc' };
      global.nextResult = { data: [{}], error: null };

      await HuntModel.createHunt(payload);

      expect(global.lastQuerySteps).toContainEqual(['insert', [expect.objectContaining({ pointsAchievable: 0 })]]);
    });

    it('passes through error', async () => {
      const HuntModel = freshModel();
      const err = { message: 'insert failed' };
      global.nextResult = { data: null, error: err };

      const out = await HuntModel.createHunt({ name: 'X' });
      expect(out).toEqual({ data: null, error: err });
    });
  });

  describe('getHunts', () => {
    it('selects * with no filters', async () => {
      const HuntModel = freshModel();
      global.nextResult = { data: [{ id: 1 }], error: null };
      const out = await HuntModel.getHunts({});
      expect(out).toEqual(global.nextResult);
      expect(global.lastQuerySteps).toContainEqual(['select', '*']);
    });

    it('filters by id and name', async () => {
      const HuntModel = freshModel();
      global.nextResult = { data: [], error: null };
      await HuntModel.getHunts({ id: 1, name: 'test' });

      expect(global.lastQuerySteps).toEqual(
        expect.arrayContaining([
          ['select', '*'],
          ['eq', 'id', 1],
          ['ilike', 'name', '%test%'],
        ])
      );
    });

    it('passes through error', async () => {
      const HuntModel = freshModel();
      const err = { message: 'db error' };
      global.nextResult = { data: null, error: err };
      const out = await HuntModel.getHunts();
      expect(out).toEqual({ data: null, error: err });
    });
  });

  describe('getHuntById', () => {
    it('selects single hunt by id', async () => {
      const HuntModel = freshModel();
      global.nextResult = { data: { id: 42 }, error: null };
      const out = await HuntModel.getHuntById(42);
      expect(out).toEqual(global.nextResult);
      expect(global.lastQuerySteps).toEqual(
        expect.arrayContaining([
          ['select', '*'],
          ['eq', 'id', 42],
          ['single'],
        ])
      );
    });
  });

  describe('updateHunt', () => {
    it('updates hunt by id and returns data', async () => {
      const HuntModel = freshModel();
      const updates = { pointsAchievable: '10', name: 'New Name' };
      const normalizedUpdates = { pointsAchievable: 10, name: 'New Name' };

      global.nextResult = { data: [{ id: 3, ...normalizedUpdates }], error: null };
      const out = await HuntModel.updateHunt(3, updates);
      expect(out).toEqual(global.nextResult);
      expect(global.lastQuerySteps).toEqual(
        expect.arrayContaining([
          ['update', normalizedUpdates],
          ['eq', 'id', 3],
          ['select'],
        ])
      );
    });

    it('coerces invalid pointsAchievable to 0 on update', async () => {
      const HuntModel = freshModel();
      global.nextResult = { data: [{}], error: null };
      await HuntModel.updateHunt(1, { pointsAchievable: 'NaN' });
      expect(global.lastQuerySteps).toContainEqual(['update', expect.objectContaining({ pointsAchievable: 0 })]);
    });

    it('passes through update error', async () => {
      const HuntModel = freshModel();
      const err = { message: 'fail' };
      global.nextResult = { data: null, error: err };
      const out = await HuntModel.updateHunt(1, { name: 'X' });
      expect(out).toEqual({ data: null, error: err });
    });
  });

  describe('deleteHunt', () => {
    it('deletes hunt by id and returns data', async () => {
      const HuntModel = freshModel();
      global.nextResult = { data: [{ id: 2 }], error: null };
      const out = await HuntModel.deleteHunt(2);
      expect(out).toEqual(global.nextResult);
      expect(global.lastQuerySteps).toEqual(
        expect.arrayContaining([
          ['delete'],
          ['eq', 'id', 2],
          ['select'],
        ])
      );
    });

    it('passes through delete error', async () => {
      const HuntModel = freshModel();
      const err = { message: 'delete fail' };
      global.nextResult = { data: null, error: err };
      const out = await HuntModel.deleteHunt(5);
      expect(out).toEqual({ data: null, error: err });
    });
  });

  describe('addForUser', () => {
    it('inserts userHunt payload and selects', async () => {
      const HuntModel = freshModel();
      const payload = { userId: 'u1', huntId: 1 };
      global.nextResult = { data: [{ id: 10, ...payload }], error: null };
      const out = await HuntModel.addForUser(payload);
      expect(out).toEqual(global.nextResult);
      expect(global.lastQuerySteps).toEqual(
        expect.arrayContaining([
          ['insert', [payload]],
          ['select'],
        ])
      );
    });
  });

  describe('getUserHuntById', () => {
    it('selects single userHunt by id', async () => {
      const HuntModel = freshModel();
      global.nextResult = { data: { id: 99 }, error: null };
      const out = await HuntModel.getUserHuntById(99);
      expect(out).toEqual(global.nextResult);
      expect(global.lastQuerySteps).toEqual(
        expect.arrayContaining([
          ['select', '*'],
          ['eq', 'id', 99],
          ['single'],
        ])
      );
    });
  });

  describe('setCompleteById', () => {
    it('updates userHunt as complete with timestamp', async () => {
      const HuntModel = freshModel();
      global.nextResult = { data: [{ id: 1, isComplete: true }], error: null };
      const out = await HuntModel.setCompleteById(1);
      expect(out).toEqual(global.nextResult);
      expect(global.lastQuerySteps).toEqual(
        expect.arrayContaining([
          ['update', expect.objectContaining({ isComplete: true, isActive: false })],
          ['eq', 'id', 1],
          ['select'],
        ])
      );
    });
  });
});

