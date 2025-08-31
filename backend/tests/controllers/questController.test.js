// backend/tests/controllers/questController.test.js
const request = require('supertest');
const express = require('express');
const QuestController = require('../../controllers/questController');
const QuestModel = require('../../models/questModel');
const { createClient } = require('@supabase/supabase-js');

jest.mock('../../models/questModel');
jest.mock('@supabase/supabase-js');

function mockReqRes({ headers = {}, body = {}, query = {} } = {}) {
  const req = { headers, body, query };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return { req, res };
}

describe('QuestController', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createQuest', () => {
    it('creates a quest successfully', async () => {
      QuestModel.createQuest.mockResolvedValue({ data: [{ id: 'q1' }], error: null });
      const { req, res } = mockReqRes({
        body: {
          name: 'Quest 1',
          collectibleId: 'c1',
          locationId: 'l1',
          createdBy: 'u1',
          pointsAchievable: 100,
        },
      });

      await QuestController.createQuest(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Quest created successfully',
        quest: { id: 'q1' },
      });
    });

    it('returns 400 if required fields missing', async () => {
      const { req, res } = mockReqRes({ body: {} });
      await QuestController.createQuest(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 500 if QuestModel.createQuest errors', async () => {
      QuestModel.createQuest.mockResolvedValue({ data: null, error: new Error('DB fail') });
      const { req, res } = mockReqRes({
        body: { name: 'Quest', collectibleId: 'c', locationId: 'l', createdBy: 'u1' },
      });
      await QuestController.createQuest(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'DB fail' });
    });
  });

  describe('getQuests', () => {
    it('returns quests successfully', async () => {
      QuestModel.getQuests.mockResolvedValue({ data: [{ id: 'q1' }], error: null });
      const { req, res } = mockReqRes({ query: {} });
      await QuestController.getQuests(req, res);
      expect(res.json).toHaveBeenCalledWith([{ id: 'q1' }]);
    });

    it('returns 500 if QuestModel.getQuests errors', async () => {
      QuestModel.getQuests.mockResolvedValue({ data: null, error: new Error('DB fail') });
      const { req, res } = mockReqRes({ query: {} });
      await QuestController.getQuests(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'DB fail' });
    });
  });

  describe('add', () => {
    it('adds a quest for user successfully', async () => {
      const mockSb = { auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) } };
      createClient.mockReturnValue(mockSb);
      QuestModel.addForUser.mockResolvedValue({ data: [{ id: 'uq1' }], error: null });

      const { req, res } = mockReqRes({
        headers: { authorization: 'Bearer token' },
        body: { questId: 'q1' },
      });
      await QuestController.add(req, res);

      expect(QuestModel.addForUser).toHaveBeenCalledWith(expect.objectContaining({ questId: 'q1' }), mockSb);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ id: 'uq1' });
    });

    it('returns 401 if no token', async () => {
      const { req, res } = mockReqRes();
      await QuestController.add(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('returns 400 if QuestModel.addForUser errors', async () => {
      const mockSb = { auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) } };
      createClient.mockReturnValue(mockSb);
      QuestModel.addForUser.mockResolvedValue({ data: null, error: new Error('DB fail') });

      const { req, res } = mockReqRes({
        headers: { authorization: 'Bearer token' },
        body: { questId: 'q1' },
      });
      await QuestController.add(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'DB fail' });
    });
  });

  describe('mine', () => {
    it('returns user quests successfully', async () => {
      const mockSb = { auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) } };
      createClient.mockReturnValue(mockSb);
      QuestModel.listForUser.mockResolvedValue({ data: [{ id: 'uq1' }], error: null });

      const { req, res } = mockReqRes({ headers: { authorization: 'Bearer token' } });
      await QuestController.mine(req, res);
      expect(res.json).toHaveBeenCalledWith([{ id: 'uq1' }]);
    });

    it('returns 401 if no token', async () => {
      const { req, res } = mockReqRes();
      await QuestController.mine(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('returns 400 if QuestModel.listForUser errors', async () => {
      const mockSb = { auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) } };
      createClient.mockReturnValue(mockSb);
      QuestModel.listForUser.mockResolvedValue({ data: null, error: new Error('DB fail') });

      const { req, res } = mockReqRes({ headers: { authorization: 'Bearer token' } });
      await QuestController.mine(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'DB fail' });
    });
  });
});
