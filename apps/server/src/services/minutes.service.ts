import {
  CreateManualMinutesBody,
  GenerateAiMinutesBody,
  GetMinutesListQuery,
  UpdateMinutesBody,
} from '../api/minutes/minutes.schema.js';
import { AppError } from '../errors/AppError.js';
import { Prisma } from '../generated/prisma/client/index.js';
import { addJob } from '../jobs/queues/index.js';
import { prisma } from '../lib/prisma.js';

export class MinutesService {
  // 호출자가 해당 룸의 멤버인지 검증 (멤버가 아니면 룸 존재 여부를 숨기기 위해 ROOM_NOT_FOUND)
  private async assertRoomMember(roomId: string, userId: string) {
    const membership = await prisma.roomMember.findFirst({
      where: { roomId, userId },
      select: { id: true },
    });

    if (membership === null) {
      throw new AppError('ROOM_NOT_FOUND');
    }
  }

  public async getMinutesList(
    roomId: string,
    userId: string,
    query: GetMinutesListQuery,
  ) {
    await this.assertRoomMember(roomId, userId);

    const { type, page, limit } = query;

    const whereCondition: Prisma.MinutesWhereInput = { roomId };
    if (type) {
      whereCondition.type = type;
    }

    const totalCount = await prisma.minutes.count({
      where: whereCondition,
    });

    const skip = (page - 1) * limit;

    const minutesData = await prisma.minutes.findMany({
      where: whereCondition,
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        author: {
          select: {
            id: true,
            githubUsername: true,
            avatarUrl: true,
          },
        },
        linkedIssueNumbers: true,
      },
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    });

    const formattedMinutes = minutesData.map(m => ({
      id: m.id,
      title: m.title,
      type: m.type,
      status: m.status,
      author: {
        id: m.author.id,
        github_username: m.author.githubUsername,
        avatar_url: m.author.avatarUrl,
      },
      linked_issue_numbers: m.linkedIssueNumbers,
      created_at: m.createdAt.toISOString(),
      updated_at: m.updatedAt.toISOString(),
    }));

    const totalPages = Math.ceil(totalCount / limit);

    return {
      minutes: formattedMinutes,
      pagination: {
        page,
        limit,
        total_pages: totalPages,
        total_count: totalCount,
      },
    };
  }

  public async createManual(
    roomId: string,
    authorId: string,
    data: CreateManualMinutesBody,
  ) {
    await this.assertRoomMember(roomId, authorId);

    const { title, type, content_md } = data;

    const newMinutes = await prisma.minutes.create({
      data: {
        roomId,
        authorId,
        title,
        type,
        contentMd: content_md,
        meetingId: null,
        actionItems: [] as Prisma.JsonArray,
      },
    });

    return {
      id: newMinutes.id,
      room_id: newMinutes.roomId,
      meeting_id: newMinutes.meetingId,
      author_id: newMinutes.authorId,
      title: newMinutes.title,
      type: newMinutes.type,
      content_md: newMinutes.contentMd,
      status: newMinutes.status,
      linked_issue_numbers: newMinutes.linkedIssueNumbers,
      action_items: newMinutes.actionItems,
      created_at: newMinutes.createdAt.toISOString(),
      updated_at: newMinutes.updatedAt.toISOString(),
    };
  }

  public async triggerAiMinutesGeneration(
    roomId: string,
    authorId: string,
    body: GenerateAiMinutesBody,
  ) {
    await this.assertRoomMember(roomId, authorId);

    const { meeting_id, title } = body;

    // 회의가 존재하고 해당 룸에 속하는지 검증 (FK 위반으로 인한 500 방지)
    const meeting = await prisma.meeting.findFirst({
      where: { id: meeting_id, roomId },
      select: { id: true },
    });

    if (!meeting) {
      throw new AppError('MEETING_NOT_FOUND');
    }

    // meetingId가 @unique이므로 이미 회의록이 있으면 409로 응답 (unique 위반 500 방지)
    const existing = await prisma.minutes.findUnique({
      where: { meetingId: meeting_id },
      select: { id: true },
    });

    if (existing) {
      throw new AppError('MINUTES_ALREADY_EXISTS');
    }

    const finalTitle = title ?? 'AI가 회의록을 생성하고 있습니다...';

    const tempMinutes = await prisma.minutes.create({
      data: {
        roomId,
        authorId,
        meetingId: meeting_id,
        title: finalTitle,
        type: 'meeting',
        status: 'generating',
      },
    });

    try {
      await addJob('minutes-generation', {
        minutesId: tempMinutes.id,
        meetingId: meeting_id,
        roomId,
        // 사용자가 지정한 제목(없으면 null). 워커가 AI 생성 제목과 구분하는 데 사용
        userTitle: title ?? null,
      });
    } catch (error) {
      // 큐 등록 실패 시 'generating' 상태로 남는 고아 레코드 방지
      await prisma.minutes.delete({ where: { id: tempMinutes.id } });
      throw error;
    }

    return {
      id: tempMinutes.id,
      room_id: tempMinutes.roomId,
      meeting_id: tempMinutes.meetingId,
      author_id: tempMinutes.authorId,
      title: tempMinutes.title,
      type: tempMinutes.type,
      content_md: tempMinutes.contentMd, // null
      status: tempMinutes.status, // "generating"
      linked_issue_numbers: tempMinutes.linkedIssueNumbers, // []
      created_at: tempMinutes.createdAt.toISOString(),
      updated_at: tempMinutes.updatedAt.toISOString(),
    };
  }

  public async getMinutesDetail(
    roomId: string,
    userId: string,
    minutesId: string,
  ) {
    await this.assertRoomMember(roomId, userId);

    // 1. 회의록 단건 조회 (User 테이블 include 및 해당 룸 검증)
    const minutes = await prisma.minutes.findFirst({
      where: {
        id: minutesId,
        roomId,
      },
      include: {
        author: true,
      },
    });

    if (!minutes) {
      throw new AppError('MINUTES_NOT_FOUND');
    }

    return {
      id: minutes.id,
      room_id: minutes.roomId,
      meeting_id: minutes.meetingId,
      title: minutes.title,
      type: minutes.type,
      content_md: minutes.contentMd,
      action_items: minutes.actionItems,
      status: minutes.status,
      linked_issue_numbers: minutes.linkedIssueNumbers,
      author: {
        id: minutes.author.id,
        github_username: minutes.author.githubUsername,
        avatar_url: minutes.author.avatarUrl,
      },
      created_at: minutes.createdAt.toISOString(),
      updated_at: minutes.updatedAt.toISOString(),
    };
  }

  public async updateMinutes(
    roomId: string,
    userId: string,
    minutesId: string,
    dto: UpdateMinutesBody,
  ) {
    await this.assertRoomMember(roomId, userId);

    const existingMinutes = await prisma.minutes.findFirst({
      where: {
        id: minutesId,
        roomId,
      },
    });

    // 회의록이 없으면 404
    if (!existingMinutes) {
      throw new AppError('MINUTES_NOT_FOUND');
    }

    // 현재 AI 생성 중('generating')이면 409 Conflict 발생!
    if (existingMinutes.status === 'generating') {
      throw new AppError('MINUTES_GENERATING');
    }

    const updated = await prisma.minutes.update({
      where: { id: minutesId },
      data: {
        title: dto.title,
        type: dto.type,
        contentMd: dto.content_md,
        actionItems: dto.action_items,
        status: dto.status,
      },
    });

    return {
      id: updated.id,
      room_id: updated.roomId,
      title: updated.title,
      type: updated.type,
      content_md: updated.contentMd,
      action_items: updated.actionItems,
      status: updated.status,
      linked_issue_numbers: updated.linkedIssueNumbers,
      updated_at: updated.updatedAt.toISOString(),
    };
  }
}
