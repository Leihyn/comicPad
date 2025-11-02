import express from 'express';
import { Comic, Collection, User } from '../models/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const { q, type = 'all', page = 1, limit = 20 } = req.query;

  if (!q) {
    return res.status(400).json({
      success: false,
      message: 'Search query required'
    });
  }

  const results = {};

  if (type === 'all' || type === 'comics') {
    results.comics = await Comic.find({
      status: 'published',
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { series: { $regex: q, $options: 'i' } }
      ]
    })
      .populate('creator', 'username profile')
      .limit(parseInt(limit))
      .skip((page - 1) * limit);
  }

  if (type === 'all' || type === 'creators') {
    results.creators = await User.find({
      isCreator: true,
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { 'profile.displayName': { $regex: q, $options: 'i' } }
      ]
    })
      .select('username profile isCreator')
      .limit(parseInt(limit));
  }

  if (type === 'all' || type === 'collections') {
    results.collections = await Collection.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ]
    })
      .populate('creator', 'username profile')
      .limit(parseInt(limit));
  }

  res.json({
    success: true,
    data: results
  });
}));

export default router;
