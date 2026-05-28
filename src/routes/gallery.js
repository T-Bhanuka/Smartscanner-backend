const express = require('express');
const Gallery = require('../models/Gallery');
const authenticate = require('../middleware/authenticate');

const router = express.Router();

// Upload image to gallery
router.post('/upload', authenticate, async (req, res) => {
  try {
    const { imageData, title, description, tags, receiptId } = req.body;

    if (!imageData) {
      return res.status(400).json({ error: 'Image data required' });
    }

    const gallery = new Gallery({
      userId: req.userId,
      imageUrl: imageData, // In production, upload to cloud storage
      rawImageData: imageData,
      title,
      description,
      tags: tags || [],
      receipt: receiptId
    });

    await gallery.save();

    res.status(201).json({
      message: 'Image uploaded',
      image: gallery
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all gallery images
router.get('/', authenticate, async (req, res) => {
  try {
    const { skip = 0, limit = 20, tags } = req.query;

    const query = { userId: req.userId };

    if (tags) {
      query.tags = { $in: tags.split(',') };
    }

    const images = await Gallery.find(query)
      .sort({ timestamp: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .populate('receipt');

    const total = await Gallery.countDocuments(query);

    res.json({
      images,
      pagination: { total, skip: parseInt(skip), limit: parseInt(limit) }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single image
router.get('/:id', authenticate, async (req, res) => {
  try {
    const image = await Gallery.findOne({
      _id: req.params.id,
      userId: req.userId
    }).populate('receipt');

    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    res.json(image);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update image metadata
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { title, description, tags } = req.body;

    const image = await Gallery.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { title, description, tags },
      { new: true }
    );

    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    res.json({ message: 'Image updated', image });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete image
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const image = await Gallery.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId
    });

    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    res.json({ message: 'Image deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
