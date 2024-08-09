import { getTweets, getTweetById, createTweet, likeTweet } from '../models/tweetmodel';

export const getTweets = async (req, res) => {
  try {
    const tweets = await getTweets();
    res.json(tweets);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching tweets' });
  }
};

export const getTweet = async (req, res) => {
  try {
    const id = req.params.id;
    const tweet = await getTweetById(id);
    if (!tweet) {
      res.status(404).json({ message: 'Tweet not found' });
    } else {
      res.json(tweet);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching tweet' });
  }
};

export const createTweet = async (req, res) => {
  try {
    const tweet = await createTweet(req.body);
    res.json(tweet);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error creating tweet' });
  }
};

export const likeTweet = async (req, res) => {
  try {
    const tweetId = req.params.id;
    const userId = req.user.id;
    await likeTweet(tweetId, userId);
    res.json({ message: 'Tweet liked successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error liking tweet' });
  }
};