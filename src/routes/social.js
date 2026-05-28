const express = require('express');
const Social = require('../models/Social');
const User = require('../models/User');
const Receipt = require('../models/Receipt');
const authenticate = require('../middleware/authenticate');

const router = express.Router();

// Share receipt
router.post('/share', authenticate, async (req, res) => {
  try {
    const { receiptId, description, visibility } = req.body;

    const receipt = await Receipt.findOne({
      _id: receiptId,
      userId: req.userId
    });

    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    const share = new Social({
      userId: req.userId,
      receiptId,
      description,
      visibility: visibility || 'private'
    });

    await share.save();

    res.status(201).json({
      message: 'Receipt shared',
      share
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get shared receipts
router.get('/feed', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    const shares = await Social.find({
      $or: [
        { userId: req.userId },
        { userId: { $in: user.following }, visibility: { $in: ['public', 'friends'] } },
        { visibility: 'public' }
      ]
    })
      .populate('userId', 'name email profilePicture')
      .populate('receiptId')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(shares);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Like a shared receipt
router.post('/:shareId/like', authenticate, async (req, res) => {
  try {
    const share = await Social.findById(req.params.shareId);

    if (!share) {
      return res.status(404).json({ error: 'Share not found' });
    }

    const alreadyLiked = share.likes.some(id => id.toString() === req.userId);
    if (alreadyLiked) {
      share.likes = share.likes.filter(id => id.toString() !== req.userId);
    } else {
      share.likes.push(req.userId);
    }

    await share.save();

    res.json({
      message: alreadyLiked ? 'Like removed' : 'Receipt liked',
      share
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Comment on shared receipt
router.post('/:shareId/comment', authenticate, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Comment text required' });
    }

    const share = await Social.findByIdAndUpdate(
      req.params.shareId,
      {
        $push: {
          comments: {
            userId: req.userId,
            text
          }
        }
      },
      { new: true }
    ).populate('comments.userId', 'name profilePicture');

    if (!share) {
      return res.status(404).json({ error: 'Share not found' });
    }

    res.json({
      message: 'Comment added',
      share
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Follow user
router.post('/users/:targetUserId/follow', authenticate, async (req, res) => {
  try {
    const { targetUserId } = req.params;

    if (targetUserId === req.userId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = await User.findById(req.userId);

    const alreadyFollowing = user.following.some(id => id.toString() === targetUserId);
    if (alreadyFollowing) {
      user.following = user.following.filter(id => id.toString() !== targetUserId);
      targetUser.followers = targetUser.followers.filter(id => id.toString() !== req.userId);
    } else {
      user.following.push(targetUserId);
      targetUser.followers.push(req.userId);
    }

    await user.save();
    await targetUser.save();

    res.json({
      message: alreadyFollowing ? 'Unfollowed' : 'Following',
      following: !alreadyFollowing
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user profile
router.get('/users/:userId', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .populate('followers', 'name email profilePicture')
      .populate('following', 'name email profilePicture');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's public shares
    const shares = await Social.find({
      userId: req.params.userId,
      visibility: 'public'
    }).populate('receiptId').limit(10);

    res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture,
        followers: user.followers,
        following: user.following,
        followerCount: user.followers.length,
        followingCount: user.following.length
      },
      recentShares: shares
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete share
router.delete('/:shareId', authenticate, async (req, res) => {
  try {
    const share = await Social.findOne({
      _id: req.params.shareId,
      userId: req.userId
    });

    if (!share) {
      return res.status(404).json({ error: 'Share not found' });
    }

    await Social.deleteOne({ _id: req.params.shareId });

    res.json({ message: 'Share deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
