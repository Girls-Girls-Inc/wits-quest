// backend/controllers/privateLeaderboardController.js
const PrivateLeaderboardModel = require('../models/privateLeaderboardModel');

const PrivateLeaderboardController = {
  // Create a new private leaderboard
  create: async (req, res) => {
    try {
      const ownerId = req.user?.id;
      if (!ownerId) return res.status(401).json({ error: 'Unauthorized' });

      const { name, description, coverImage, periodType, periodStart, periodEnd, isActive } = req.body;
      if (!name) return res.status(400).json({ error: 'name is required' });

      // Create leaderboard with ownerUserId from JWT
      const { data, error } = await PrivateLeaderboardModel.create({
        ownerUserId: ownerId,
        name,
        description,
        coverImage,
        periodType,
        periodStart,
        periodEnd,
        isActive: isActive ?? true
      });

      if (error) return res.status(400).json({ error: error.message || error });

      // Add owner as a member (role: 'owner') — idempotent in the model now
      const { data: memberData, error: memberError } = await PrivateLeaderboardModel.addMember({
        leaderboardId: data.id,
        userId: ownerId,
        role: 'owner'
      });

      if (memberError) {
        // Non-fatal: log and continue. With model idempotency this should rarely happen.
        console.warn('addMember non-fatal error:', memberError);
      }

      return res.status(201).json(data);
    } catch (err) {
      console.error('Error creating leaderboard:', err);
      return res.status(500).json({ error: err.message });
    }
  },

  // List leaderboards for the logged-in user or a specific ID
  list: async (req, res) => {
    try {
      const userId = req.user?.id;
      // support both ?id=... and /:id
      const id = (req.query && req.query.id) || (req.params && req.params.id);

      if (id) {
        const leaderboardId = String(id).trim();
        const { data, error } = await PrivateLeaderboardModel.findById(leaderboardId);
        if (error) return res.status(400).json({ error: error.message || error });
        if (!data) return res.status(404).json({ error: 'Not found' });
        return res.json(data);
      }

      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { data, error } = await PrivateLeaderboardModel.listForUser(userId);
      if (error) return res.status(400).json({ error: error.message || error });
      return res.json(data || []);
    } catch (err) {
      console.error('Error listing leaderboards:', err);
      return res.status(500).json({ error: err.message });
    }
  },

  // Get standings for a leaderboard
  standings: async (req, res) => {
    try {
      const userId = req.user?.id;
      const leaderboardId = req.params.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      // Check membership
      const members = await PrivateLeaderboardModel.listMembers(leaderboardId);
      if (members.error) return res.status(400).json({ error: members.error.message || members.error });

      const isMember = (members.data || []).some(m => String(m.userId) === String(userId));
      const ownerId = await PrivateLeaderboardModel.getOwnerUserId(leaderboardId);
      if (!isMember && String(ownerId) !== String(userId)) {
        return res.status(403).json({ error: 'Not a member' });
      }

      const { data, error } = await PrivateLeaderboardModel.getStandings(leaderboardId);
      if (error) return res.status(400).json({ error: error.message || error });
      return res.json(data || []);
    } catch (err) {
      console.error('Error fetching standings:', err);
      return res.status(500).json({ error: err.message });
    }
  },

  // Join a leaderboard using an invite code
  joinByCode: async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { code } = req.body;
      if (!code) return res.status(400).json({ error: 'invite code required' });

      const { data, error } = await PrivateLeaderboardModel.addMemberByInviteCode({ inviteCode: code, userId });
      if (error) return res.status(400).json({ error: error.message || error });
      return res.json({ message: 'Joined', member: data });
    } catch (err) {
      console.error('Error joining leaderboard:', err);
      return res.status(500).json({ error: err.message });
    }
  },

  // Invite a member to a leaderboard (owner only)
  inviteMember: async (req, res) => {
    try {
      const ownerId = req.user?.id;
      if (!ownerId) return res.status(401).json({ error: 'Unauthorized' });

      const leaderboardId = req.params.id;
      const { userId: newUserId, role } = req.body;
      if (!newUserId) return res.status(400).json({ error: 'userId required' });

      const owner = await PrivateLeaderboardModel.getOwnerUserId(leaderboardId);
      if (String(owner) !== String(ownerId)) return res.status(403).json({ error: 'Only owner can invite' });

      const { data, error } = await PrivateLeaderboardModel.addMember({ leaderboardId, userId: newUserId, role: role || 'member' });
      if (error) return res.status(400).json({ error: error.message || error });

      return res.status(201).json(data);
    } catch (err) {
      console.error('Error inviting member:', err);
      return res.status(500).json({ error: err.message });
    }
  },

  // List members (owner only)
  listMembers: async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const leaderboardId = req.params.id;
      const owner = await PrivateLeaderboardModel.getOwnerUserId(leaderboardId);
      if (String(owner) !== String(userId)) return res.status(403).json({ error: 'Only owner can list members' });

      const { data, error } = await PrivateLeaderboardModel.listMembers(leaderboardId);
      if (error) return res.status(400).json({ error: error.message || error });
      return res.json(data || []);
    } catch (err) {
      console.error('Error listing members:', err);
      return res.status(500).json({ error: err.message });
    }
  },

  // Remove a member (owner or self)
  removeMember: async (req, res) => {
    try {
      const callerId = req.user?.id;
      if (!callerId) return res.status(401).json({ error: 'Unauthorized' });

      const leaderboardId = req.params.id;
      const targetUserId = req.params.userId;

      const owner = await PrivateLeaderboardModel.getOwnerUserId(leaderboardId);
      if (String(owner) !== String(callerId) && String(callerId) !== String(targetUserId)) {
        return res.status(403).json({ error: 'Not allowed' });
      }

      const { error } = await PrivateLeaderboardModel.removeMember({ leaderboardId, userId: targetUserId });
      if (error) return res.status(400).json({ error: error.message || error });

      return res.status(204).send();
    } catch (err) {
      console.error('Error removing member:', err);
      return res.status(500).json({ error: err.message });
    }
  },

  // Update a leaderboard (owner only)
  update: async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const leaderboardId = req.params.id;
      const owner = await PrivateLeaderboardModel.getOwnerUserId(leaderboardId);
      if (String(owner) !== String(userId)) return res.status(403).json({ error: 'Only owner can update' });

      const changes = req.body || {};
      const { data, error } = await PrivateLeaderboardModel.updateById(leaderboardId, changes);
      if (error) return res.status(400).json({ error: error.message || error });

      return res.json(data);
    } catch (err) {
      console.error('Error updating leaderboard:', err);
      return res.status(500).json({ error: err.message });
    }
  },

  // Delete a leaderboard (owner only)
  delete: async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const leaderboardId = req.params.id;
      const owner = await PrivateLeaderboardModel.getOwnerUserId(leaderboardId);
      if (String(owner) !== String(userId)) return res.status(403).json({ error: 'Only owner can delete' });

      const { error } = await PrivateLeaderboardModel.deleteById(leaderboardId);
      if (error) return res.status(400).json({ error: error.message || error });
      return res.status(204).send();
    } catch (err) {
      console.error('Error deleting leaderboard:', err);
      return res.status(500).json({ error: err.message });
    }
  }
};

module.exports = PrivateLeaderboardController;
