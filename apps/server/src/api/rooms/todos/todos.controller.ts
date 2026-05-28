import { Response, NextFunction } from 'express';

import { AppError } from '../../../errors/AppError.js';
import { createTodos } from '../../../services/todos.service.js';
import { AuthenticatedRequest } from '../../../types/index.js';

import { CreateTodosInput } from './todos.schema.js';

export async function createTodosHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id;
    if (userId === undefined) {
      throw new AppError('UNAUTHORIZED');
    }

    const { roomId } = req.params as { roomId: string };
    const input = req.body as CreateTodosInput;

    const todos = await createTodos(userId, roomId, input);

    res.status(201).json({ success: true, data: { todos } });
  } catch (err) {
    next(err);
  }
}
