import express from 'express';
import userRoutes from './user.routes';
import tweetRoutes from './tweet.routes';

const app = express();

app.use(express.json());
app.use('/users', userRoutes);
app.use('/tweets', tweetRoutes);

const port = 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});