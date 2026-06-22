const express = require('express');
const FamilyConnection = require('../models/FamilyConnection');
const User = require('../models/User');
const authenticate = require('../middleware/authenticate');

const router = express.Router();

// POST /api/family/request
// Takes an email in the body, finds the user by email, and creates a new FamilyConnection with status 'pending'
router.post('/request', authenticate, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const receiver = await User.findOne({ email: email.toLowerCase() });
    if (!receiver) {
      return res.status(404).json({ error: 'User with this email not found' });
    }

    if (receiver._id.toString() === req.userId) {
      return res.status(400).json({ error: 'You cannot send a family connection request to yourself' });
    }

    // Check for existing connection between the two users (in either direction)
    const existingConnection = await FamilyConnection.findOne({
      $or: [
        { requesterId: req.userId, receiverId: receiver._id },
        { requesterId: receiver._id, receiverId: req.userId }
      ]
    });

    if (existingConnection) {
      if (existingConnection.status === 'accepted') {
        return res.status(400).json({ error: 'You are already connected with this user' });
      }
      if (existingConnection.status === 'pending') {
        return res.status(400).json({ error: 'A connection request is already pending between you two' });
      }
      // If previous request was rejected, reset it to pending and set the current user as requester
      if (existingConnection.status === 'rejected') {
        existingConnection.requesterId = req.userId;
        existingConnection.receiverId = receiver._id;
        existingConnection.status = 'pending';
        await existingConnection.save();

        return res.status(200).json({
          message: 'Connection request sent successfully',
          connection: existingConnection
        });
      }
    }

    const connection = new FamilyConnection({
      requesterId: req.userId,
      receiverId: receiver._id,
      status: 'pending'
    });

    await connection.save();

    res.status(201).json({
      message: 'Connection request sent successfully',
      connection
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/family/accept/:requestId
// Finds the FamilyConnection and updates the status to 'accepted'. Only receiverId can accept.
router.put('/accept/:requestId', authenticate, async (req, res) => {
  try {
    const connection = await FamilyConnection.findById(req.params.requestId);

    if (!connection) {
      return res.status(404).json({ error: 'Connection request not found' });
    }

    if (connection.status === 'accepted') {
      return res.status(400).json({ error: 'Connection request has already been accepted' });
    }

    if (connection.receiverId.toString() !== req.userId) {
      return res.status(403).json({ error: 'Only the receiver can accept this request' });
    }

    connection.status = 'accepted';
    await connection.save();

    res.json({
      message: 'Connection request accepted successfully',
      connection
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/family/connections
// Returns a list of all accepted connected users for the current req.userId.
router.get('/connections', authenticate, async (req, res) => {
  try {
    const connections = await FamilyConnection.find({
      status: 'accepted',
      $or: [
        { requesterId: req.userId },
        { receiverId: req.userId }
      ]
    })
    .populate('requesterId', 'name email')
    .populate('receiverId', 'name email');

    const connectedUsers = connections
      .map(conn => {
        const isRequester = conn.requesterId && conn.requesterId._id.toString() === req.userId;
        const targetUser = isRequester ? conn.receiverId : conn.requesterId;
        if (!targetUser) return null;

        return {
          _id: targetUser._id,
          name: targetUser.name,
          email: targetUser.email,
          connectionId: conn._id,
          connectedAt: conn.updatedAt
        };
      })
      .filter(user => user !== null);

    res.json(connectedUsers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/family/requests/pending
// Returns a list of all pending incoming connection requests for the current user.
router.get('/requests/pending', authenticate, async (req, res) => {
  try {
    const requests = await FamilyConnection.find({
      receiverId: req.userId,
      status: 'pending'
    })
    .populate('requesterId', 'name email');

    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/family/reject/:requestId
// Updates the status of the connection request to 'rejected'. Only the receiver can reject.
router.put('/reject/:requestId', authenticate, async (req, res) => {
  try {
    const connection = await FamilyConnection.findById(req.params.requestId);

    if (!connection) {
      return res.status(404).json({ error: 'Connection request not found' });
    }

    if (connection.status === 'rejected') {
      return res.status(400).json({ error: 'Connection request has already been rejected' });
    }

    if (connection.receiverId.toString() !== req.userId) {
      return res.status(403).json({ error: 'Only the receiver can reject this request' });
    }

    connection.status = 'rejected';
    await connection.save();

    res.json({
      message: 'Connection request rejected successfully',
      connection
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
