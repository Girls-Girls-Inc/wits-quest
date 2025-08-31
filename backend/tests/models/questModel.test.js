// backend/tests/models/questModel.test.js

// We mock @supabase/supabase-js so the model's top-level createClient()
// doesn't require real env vars during import.
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

const { createClient } = require('@supabase/supabase-js');

describe('QuestModel', () => {
  let QuestModel;

  // Per-test result holders so we can steer what each query resolves to
  let resultQuestsInsertSelect;
  let resultQuestsSelect; // for getQuests (awaiting the builder)
  let resultUserQuestsInsertSelect;
  let resultUserQuestsOrder; // for listForUser (await order(...))
  let resultUserQuestsUpdateSelect;

  // We also keep references to some mocks for assertions
  let questsEqMock;
  let userQuestsEqMockUpdateChain; // eq in update chain for setComplete

  // Build a thenable query builder for getQuests
  const makeQuestsSelectBuilder = () => {
    const builder = {};
    questsEqMock = jest.fn(() => builder);
    builder.eq = questsEqMock;
    // awaiting this object should resolve to the configured result
    builder.then = (resolve) => resolve(resultQuestsSelect);
    return builder;
  };

  // Build the select->eq->order chain for listForUser
  const makeUserQuestsSelectBuilder = () => {
    return {
      eq: jest.fn(() => ({
        order: jest.fn(async () => resultUserQuestsOrder),
      })),
    };
  };

  // Build the update->eq->eq->select chain for setComplete
  const makeUserQuestsUpdateBuilder = () => {
    const chain = {};
    userQuestsEqMockUpdateChain = jest.fn(() => chain);
    chain.eq = userQuestsEqMockUpdateChain; // called twice (userId, questId)
    chain.select = jest.fn(async () => resultUserQuestsUpdateSelect);
    return chain;
  };

  // Our mocked Supabase client with per-table behavior
  const buildMockClient = () => ({
    from: jest.fn((table) => {
      if (table === 'quests') {
        return {
          // createQuest: insert(...).select()
          insert: jest.fn(() => ({
            select: jest.fn(async () => resultQuestsInsertSelect),
          })),
          // getQuests: select('*') -> [possibly .eq(...)] -> await builder
          select: jest.fn(() => makeQuestsSelectBuilder()),
        };
      }
      if (table === 'userQuests') {
        return {
          // addForUser: insert(...).select()
          insert: jest.fn(() => ({
            select: jest.fn(async () => resultUserQuestsInsertSelect),
          })),
          // listForUser: select(...).eq(...).order(...)
          select: jest.fn(() => makeUserQuestsSelectBuilder()),
          // setComplete: update(...).eq(...).eq(...).select()
          update: jest.fn(() => makeUserQuestsUpdateBuilder()),
        };
      }
      // Fallback (shouldn't be hit)
      return {};
    }),
  });

  const loadModelFresh = () => {
    jest.isolateModules(() => {
      QuestModel = require('../../models/questModel');
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default "success" results for all operations
    resultQuestsInsertSelect = { data: [{ id: 1, title: 'Q1' }], error: null };
    resultQuestsSelect = { data: [{ id: 42, title: 'GetQ' }], error: null };
    resultUserQuestsInsertSelect = { data: [{ id: 'uq1' }], error: null };
    resultUserQuestsOrder = { data: [{ id: 'uq2' }], error: null };
    resultUserQuestsUpdateSelect = { data: [{ id: 'uq3', isComplete: true }], error: null };

    // Make createClient return our mock client instance
    createClient.mockReturnValue(buildMockClient());

    // Import the model AFTER wiring the mock return
    loadModelFresh();
  });

  // ---------- createQuest ----------
  it('createQuest inserts a quest (success)', async () => {
    const res = await QuestModel.createQuest({ title: 'New Quest' });
    expect(res).toEqual({ data: [{ id: 1, title: 'Q1' }], error: null });
  });

  it('createQuest returns error if insert/select fails', async () => {
    resultQuestsInsertSelect = { data: null, error: 'insert failed' };
    loadModelFresh();
    const res = await QuestModel.createQuest({ title: 'Bad Quest' });
    expect(res).toEqual({ data: null, error: 'insert failed' });
  });

  // ---------- getQuests ----------
  it('getQuests with no filters (exercises falsy branches)', async () => {
    const res = await QuestModel.getQuests({});
    expect(res).toEqual({ data: [{ id: 42, title: 'GetQ' }], error: null });
    // Ensure we did not call any eq when no filters provided
    expect(questsEqMock).toBeDefined();
    expect(questsEqMock).not.toHaveBeenCalled();
  });

  it('getQuests applies all filters (exercises truthy branches)', async () => {
    const filters = {
      id: 123,
      createdBy: 'u1',
      collectibleId: 5,
      locationId: 9,
      isActive: true,
    };
    const res = await QuestModel.getQuests(filters);
    expect(res).toEqual({ data: [{ id: 42, title: 'GetQ' }], error: null });

    // each filter should have produced an eq call
    expect(questsEqMock).toHaveBeenCalledWith('id', 123);
    expect(questsEqMock).toHaveBeenCalledWith('createdBy', 'u1');
    expect(questsEqMock).toHaveBeenCalledWith('collectibleId', 5);
    expect(questsEqMock).toHaveBeenCalledWith('locationId', 9);
    expect(questsEqMock).toHaveBeenCalledWith('isActive', true);
  });

  // ---------- addForUser ----------
  it('addForUser inserts user quest (success)', async () => {
    const res = await QuestModel.addForUser({ userId: 'u1', questId: 7 });
    expect(res).toEqual({ data: [{ id: 'uq1' }], error: null });
  });

  it('addForUser returns error on failure', async () => {
    resultUserQuestsInsertSelect = { data: null, error: 'insert user quest failed' };
    loadModelFresh();
    const res = await QuestModel.addForUser({ userId: 'u1', questId: 7 });
    expect(res).toEqual({ data: null, error: 'insert user quest failed' });
  });

  // ---------- listForUser ----------
  it('listForUser selects and orders (success)', async () => {
    const res = await QuestModel.listForUser('u1');
    expect(res).toEqual({ data: [{ id: 'uq2' }], error: null });
  });

  it('listForUser returns error on failure', async () => {
    resultUserQuestsOrder = { data: null, error: 'list failed' };
    loadModelFresh();
    const res = await QuestModel.listForUser('u1');
    expect(res).toEqual({ data: null, error: 'list failed' });
  });

  // ---------- setComplete ----------
  it('setComplete updates as complete (success)', async () => {
    const res = await QuestModel.setComplete({ userId: 'u1', questId: 99 });
    expect(userQuestsEqMockUpdateChain).toHaveBeenCalledWith('userId', 'u1');
    expect(userQuestsEqMockUpdateChain).toHaveBeenCalledWith('questId', 99);
    expect(res).toEqual({ data: [{ id: 'uq3', isComplete: true }], error: null });
  });

  it('setComplete returns error on failure', async () => {
    resultUserQuestsUpdateSelect = { data: null, error: 'update failed' };
    loadModelFresh();
    const res = await QuestModel.setComplete({ userId: 'u1', questId: 99 });
    expect(res).toEqual({ data: null, error: 'update failed' });
  });
});
