import express from 'express';
import {
  getTweets,
  getTweet,
  createTweet,
  likeTweet,
} from './tweetcontroller';

const router = express.Router();
router.get('/', getTweets);
router.get('/:id', getTweet);
router.post('/', createTweet);
router.post('/:id/like', likeTweet);

export default router;
