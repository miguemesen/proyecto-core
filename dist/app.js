import express from 'express';
import userRoutes from './userroutes';
import tweetRoutes from './tweetroutes';

const app = express();

app.use(express.json());
app.use('/users', userRoutes);
app.use('/tweets', tweetRoutes);

const port = 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
