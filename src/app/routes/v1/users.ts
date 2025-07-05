import express from 'express';
import { signInHandler } from '~/app/controllers/v1';

const userRouter = express.Router();

userRouter.get('/signin', signInHandler);

export { userRouter as UserRoutes };
