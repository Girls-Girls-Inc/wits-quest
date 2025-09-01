// tests/models/locationModel.test.js
const LocationModel = require('../../models/locationModel');
const supabase = require('../../supabase/supabaseClient');

jest.mock('../../supabase/supabaseClient', () => {
  const mQuery = {
    select: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
  };
  return {
    from: jest.fn(() => mQuery),
    __mQuery: mQuery,
  };
});

describe('LocationModel', () => {
  let mQuery;

  beforeEach(() => {
    jest.clearAllMocks();
    mQuery = supabase.__mQuery;
  });

  describe('getLocations', () => {
    it('should fetch all locations', async () => {
      mQuery.select.mockReturnThis();
      mQuery.order.mockReturnThis();
      mQuery.then = undefined;
      mQuery.eq.mockReturnThis();
      mQuery.ilike.mockReturnThis();
      mQuery.mockReturnValueOnce({ data: [{ id: 1, name: 'Cape Town' }], error: null });

      mQuery.select.mockReturnValueOnce({ data: [{ id: 1, name: 'Cape Town' }], error: null });

      mQuery.select.mockReturnValue({ data: [{ id: 1, name: 'Cape Town' }], error: null });

      const result = await LocationModel.getLocations();
      expect(result).toEqual([{ id: 1, name: 'Cape Town' }]);
    });

    it('should filter by id and name', async () => {
      mQuery.select.mockReturnThis();
      mQuery.order.mockReturnThis();
      mQuery.eq.mockReturnThis();
      mQuery.ilike.mockReturnValue({ data: [{ id: 2, name: 'Durban' }], error: null });

      const result = await LocationModel.getLocations(2, 'Durban');
      expect(mQuery.eq).toHaveBeenCalledWith('id', 2);
      expect(mQuery.ilike).toHaveBeenCalledWith('name', '%Durban%');
      expect(result).toEqual([{ id: 2, name: 'Durban' }]);
    });

    it('should throw error when supabase fails', async () => {
      mQuery.select.mockReturnThis();
      mQuery.order.mockReturnThis();
      mQuery.mockReturnValueOnce({ data: null, error: new Error('DB fail') });
      await expect(LocationModel.getLocations()).rejects.toThrow('DB fail');
    });
  });

  describe('createLocation', () => {
    it('should create a location', async () => {
      mQuery.insert.mockReturnValueOnce({
        select: () => ({ data: [{ id: 1, name: 'New Location' }], error: null }),
      });

      const result = await LocationModel.createLocation({ name: 'New Location' });
      expect(result).toEqual([{ id: 1, name: 'New Location' }]);
    });

    it('should throw error if creation fails', async () => {
      mQuery.insert.mockReturnValueOnce({
        select: () => ({ data: null, error: new Error('Insert fail') }),
      });
      await expect(LocationModel.createLocation({})).rejects.toThrow('Insert fail');
    });
  });

  describe('updateLocation', () => {
    it('should update a location', async () => {
      mQuery.update.mockReturnValueOnce({
        eq: () => ({
          select: () => ({ data: [{ id: 1, name: 'Updated' }], error: null }),
        }),
      });

      const result = await LocationModel.updateLocation(1, { name: 'Updated' });
      expect(result).toEqual([{ id: 1, name: 'Updated' }]);
    });

    it('should throw error if update fails', async () => {
      mQuery.update.mockReturnValueOnce({
        eq: () => ({
          select: () => ({ data: null, error: new Error('Update fail') }),
        }),
      });
      await expect(LocationModel.updateLocation(1, {})).rejects.toThrow('Update fail');
    });
  });

  describe('deleteLocation', () => {
    it('should delete a location', async () => {
      mQuery.delete.mockReturnValueOnce({
        eq: () => ({ error: null }),
      });

      const result = await LocationModel.deleteLocation(1);
      expect(result).toEqual({ error: null });
    });

    it('should return error if deletion fails', async () => {
      mQuery.delete.mockReturnValueOnce({
        eq: () => ({ error: new Error('Delete fail') }),
      });

      const result = await LocationModel.deleteLocation(1);
      expect(result.error).toEqual(new Error('Delete fail'));
    });
  });

  describe('getLocationById', () => {
    it('should fetch location by id', async () => {
      mQuery.select.mockReturnValueOnce({
        eq: () => ({
          limit: () => ({
            single: () => ({ data: { id: 1, name: 'Cape Town' }, error: null }),
          }),
        }),
      });

      const result = await LocationModel.getLocationById(1);
      expect(result).toEqual({ id: 1, name: 'Cape Town' });
    });

    it('should throw error when supabase fails', async () => {
      mQuery.select.mockReturnValueOnce({
        eq: () => ({
          limit: () => ({
            single: () => ({ data: null, error: new Error('Not found') }),
          }),
        }),
      });
      await expect(LocationModel.getLocationById(99)).rejects.toThrow('Not found');
    });
  });
});
