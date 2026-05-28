import { Response, NextFunction } from 'express';

import { AppError } from '../../../errors/AppError.js';
import { createTodos, getTodos } from '../../../services/todos.service.js';
import { AuthenticatedRequest } from '../../../types/index.js';

import { CreateTodosInput, GetTodosQuery } from './todos.schema.js';

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

export async function getTodosHandler(
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
    const query = req.query as GetTodosQuery;

    const todos = await getTodos(userId, roomId, query);

    res.status(200).json({ success: true, data: { todos } });
  } catch (err) {
    next(err);
  }
}

export async function getMyTodosHandler(
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

    // 내 이슈 = 담당자가 나 + GitHub 이슈 발행된 것만
    const todos = await getTodos(userId, roomId, {
      assignee_id: userId,
      is_issued: true,
    });

    res.status(200).json({ success: true, data: { todos } });
  } catch (err) {
    next(err);
  }
}
