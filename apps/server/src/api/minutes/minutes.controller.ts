import type { NextFunction, Response } from 'express';

import { MinutesService } from '../../services/minutes.service.js';
import { getIO } from '../../socket/index.js';
import { AuthenticatedRequest } from '../../types/index.js';

import {
  CreateManualMinutesBody,
  CreateManualMinutesParams,
  GenerateAiMinutesBody,
  GenerateAiMinutesParams,
  GetMinutesDetailParams,
  GetMinutesListParams,
  GetMinutesListQuery,
  UpdateMinutesBody,
  UpdateMinutesParams,
} from './minutes.schema.js';

export class MinutesController {
  private minutesService = new MinutesService();

  public getMinutesList = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { roomId } = req.params as GetMinutesListParams;
      const { type, page, limit } = req.query as unknown as GetMinutesListQuery;
      const userId = req.user!.id;

      const result = await this.minutesService.getMinutesList(roomId, userId, {
        type,
        page,
        limit,
      });

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public createManualMinutes = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { roomId } = req.params as CreateManualMinutesParams;
      const { title, type, content_md } = req.body as CreateManualMinutesBody;
      const authorId = req.user!.id;

      const formattedMinutes = await this.minutesService.createManual(
        roomId,
        authorId,
        {
          title,
          type,
          content_md,
        },
      );

      return res.status(201).json({
        success: true,
        data: formattedMinutes,
      });
    } catch (error) {
      next(error);
    }
  };

  public generateAiMinutes = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { roomId } = req.params as GenerateAiMinutesParams;
      const { meeting_id, title } = req.body as GenerateAiMinutesBody;
      const authorId = req.user!.id;

      const formattedResult =
        await this.minutesService.triggerAiMinutesGeneration(roomId, authorId, {
          meeting_id,
          title,
        });

      getIO().to(roomId).emit('minutes:generation-started', {
        room_id: roomId,
        minutes_id: formattedResult.id,
        meeting_id,
      });

      return res.status(202).json({
        success: true,
        message: 'AI 회의록 생성이 백그라운드에서 진행중입니다.',
        data: formattedResult,
      });
    } catch (error) {
      next(error);
    }
  };

  public getMinutesDetail = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { roomId, minutesId } = req.params as GetMinutesDetailParams;
      const userId = req.user!.id;

      const detailData = await this.minutesService.getMinutesDetail(
        roomId,
        userId,
        minutesId,
      );

      return res.status(200).json({
        success: true,
        data: detailData,
      });
    } catch (error) {
      next(error);
    }
  };

  public updateMinutes = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { roomId, minutesId } = req.params as UpdateMinutesParams;
      const dto = req.body as UpdateMinutesBody;
      const userId = req.user!.id;

      const updatedData = await this.minutesService.updateMinutes(
        roomId,
        userId,
        minutesId,
        dto,
      );

      return res.status(200).json({
        success: true,
        message: '회의록이 성공적으로 수정되었습니다.',
        data: updatedData,
      });
    } catch (error) {
      next(error);
    }
  };

  public refineMinutesWithAI = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      /*
       *   const { roomId, minutesId } = req.params;
       *   const { prompt } = req.body;
       */

      return res.status(200).json({
        success: true,
        data: {
          refined_content_md: 'AI 재생성 회의록',
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
