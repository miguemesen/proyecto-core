import express from 'express';
import {
  getUser,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
} from './usercontroller';

const router = express.Router();
router.get('/:id', getUser);
router.get('/', getUsers);
router.post('/', createUser);
router.patch('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;
