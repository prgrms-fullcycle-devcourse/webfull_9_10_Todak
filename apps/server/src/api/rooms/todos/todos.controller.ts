import { Response, NextFunction } from 'express';

import { AppError } from '../../../errors/AppError.js';
import {
  createTodoComment,
  createTodoLabel,
  createTodoReaction,
  createTodos,
  deleteTodo,
  deleteTodoComment,
  deleteTodoLabel,
  deleteTodoReaction,
  getTodo,
  getTodoComments,
  getTodoEvents,
  getTodoLabels,
  getTodoMilestones,
  getTodos,
  toTodoEventPayload,
  updateTodo,
  updateTodoComment,
  updateTodoLabel,
} from '../../../services/todos.service.js';
import { getIO } from '../../../socket/index.js';
import { AuthenticatedRequest } from '../../../types/index.js';

import {
  CreateCommentInput,
  CreateLabelInput,
  CreateReactionInput,
  CreateTodosInput,
  GetTodosQuery,
  UpdateCommentInput,
  UpdateLabelInput,
  UpdateTodoInput,
} from './todos.schema.js';

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

    getIO().to(roomId).emit('todo:created', { roomId, todos });

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

export async function deleteTodoHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id;
    if (userId === undefined) {
      throw new AppError('UNAUTHORIZED');
    }

    const { roomId, todoId } = req.params as {
      roomId: string;
      todoId: string;
    };

    await deleteTodo(userId, roomId, todoId);

    getIO().to(roomId).emit('todo:deleted', { roomId, todoId });

    res.status(200).json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}

export async function updateTodoHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id;
    if (userId === undefined) {
      throw new AppError('UNAUTHORIZED');
    }

    const { roomId, todoId } = req.params as {
      roomId: string;
      todoId: string;
    };
    const input = req.body as UpdateTodoInput;

    const todo = await updateTodo(userId, roomId, todoId, input);

    getIO()
      .to(roomId)
      .emit('todo:updated', { roomId, todo: toTodoEventPayload(todo) });

    res.status(200).json({ success: true, data: { todo } });
  } catch (err) {
    next(err);
  }
}

export async function getTodoLabelsHandler(
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
    const labels = await getTodoLabels(userId, roomId);
    res.status(200).json({ success: true, data: { labels } });
  } catch (err) {
    next(err);
  }
}

export async function getTodoHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id;
    if (userId === undefined) {
      throw new AppError('UNAUTHORIZED');
    }
    const { roomId, todoId } = req.params as { roomId: string; todoId: string };
    const todo = await getTodo(userId, roomId, todoId);
    res.status(200).json({ success: true, data: { todo } });
  } catch (err) {
    next(err);
  }
}

export async function getTodoCommentsHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id;
    if (userId === undefined) {
      throw new AppError('UNAUTHORIZED');
    }
    const { roomId, todoId } = req.params as { roomId: string; todoId: string };
    const comments = await getTodoComments(userId, roomId, todoId);
    res.status(200).json({ success: true, data: { comments } });
  } catch (err) {
    next(err);
  }
}

export async function createTodoCommentHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id;
    if (userId === undefined) {
      throw new AppError('UNAUTHORIZED');
    }
    const { roomId, todoId } = req.params as { roomId: string; todoId: string };
    const { body } = req.body as CreateCommentInput;
    const comment = await createTodoComment(userId, roomId, todoId, body);
    res.status(201).json({ success: true, data: { comment } });
  } catch (err) {
    next(err);
  }
}

export async function updateTodoCommentHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id;
    if (userId === undefined) {
      throw new AppError('UNAUTHORIZED');
    }
    const { roomId, todoId, commentId } = req.params as {
      roomId: string;
      todoId: string;
      commentId: string;
    };
    const { body } = req.body as UpdateCommentInput;
    const comment = await updateTodoComment(
      userId,
      roomId,
      todoId,
      Number(commentId),
      body,
    );
    res.status(200).json({ success: true, data: { comment } });
  } catch (err) {
    next(err);
  }
}

export async function deleteTodoCommentHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id;
    if (userId === undefined) {
      throw new AppError('UNAUTHORIZED');
    }
    const { roomId, todoId, commentId } = req.params as {
      roomId: string;
      todoId: string;
      commentId: string;
    };
    await deleteTodoComment(userId, roomId, todoId, Number(commentId));
    res.status(200).json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}

export async function getTodoMilestonesHandler(
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
    const milestones = await getTodoMilestones(userId, roomId);
    res.status(200).json({ success: true, data: { milestones } });
  } catch (err) {
    next(err);
  }
}

export async function getTodoEventsHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id;
    if (userId === undefined) {
      throw new AppError('UNAUTHORIZED');
    }
    const { roomId, todoId } = req.params as { roomId: string; todoId: string };
    const events = await getTodoEvents(userId, roomId, todoId);
    res.status(200).json({ success: true, data: { events } });
  } catch (err) {
    next(err);
  }
}

export async function createTodoReactionHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id;
    if (userId === undefined) {
      throw new AppError('UNAUTHORIZED');
    }
    const { roomId, todoId } = req.params as { roomId: string; todoId: string };
    const { content } = req.body as CreateReactionInput;
    const reaction = await createTodoReaction(userId, roomId, todoId, content);
    res.status(201).json({ success: true, data: { reaction } });
  } catch (err) {
    next(err);
  }
}

export async function deleteTodoReactionHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id;
    if (userId === undefined) {
      throw new AppError('UNAUTHORIZED');
    }
    const { roomId, todoId, reactionId } = req.params as {
      roomId: string;
      todoId: string;
      reactionId: string;
    };
    await deleteTodoReaction(userId, roomId, todoId, Number(reactionId));
    res.status(200).json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}

export async function createTodoLabelHandler(
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
    const { name, color, description } = req.body as CreateLabelInput;
    const label = await createTodoLabel(
      userId,
      roomId,
      name,
      color,
      description,
    );
    res.status(201).json({ success: true, data: { label } });
  } catch (err) {
    next(err);
  }
}

export async function updateTodoLabelHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id;
    if (userId === undefined) {
      throw new AppError('UNAUTHORIZED');
    }
    const { roomId, labelName } = req.params as {
      roomId: string;
      labelName: string;
    };
    const updates = req.body as UpdateLabelInput;
    const label = await updateTodoLabel(userId, roomId, labelName, updates);
    res.status(200).json({ success: true, data: { label } });
  } catch (err) {
    next(err);
  }
}

export async function deleteTodoLabelHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id;
    if (userId === undefined) {
      throw new AppError('UNAUTHORIZED');
    }
    const { roomId, labelName } = req.params as {
      roomId: string;
      labelName: string;
    };
    await deleteTodoLabel(userId, roomId, labelName);
    res.status(200).json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}
