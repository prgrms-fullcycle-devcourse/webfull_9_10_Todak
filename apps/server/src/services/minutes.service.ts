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

    const { type, status, page, limit } = query;

    const whereCondition: Prisma.MinutesWhereInput = { roomId };
    if (type) {
      whereCondition.type = type;
    }

    if (status !== undefined) {
      whereCondition.status = status;
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

  /*
   * generating 상태의 임시 회의록 생성. 동시 요청으로 같은 meetingId가
   * 먼저 생성되면 unique 위반(P2002)이 나는데, 이를 409로 변환해 500을 방지한다.
   */
  private async createGeneratingMinutes(
    roomId: string,
    authorId: string,
    meetingId: string,
    title: string,
  ) {
    try {
      return await prisma.minutes.create({
        data: {
          roomId,
          authorId,
          meetingId,
          title,
          type: 'meeting',
          status: 'generating',
          actionItems: [] as Prisma.JsonArray,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new AppError('MINUTES_ALREADY_EXISTS');
      }

      throw error;
    }
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

    const finalTitle = title ?? 'AI가 회의록을 생성하고 있습니다...';

    /*
     * meetingId가 @unique이므로 회의당 회의록은 1건이다.
     * - generating(생성 중): 중복 실행 방지 → MINUTES_GENERATING(409)
     * - confirmed(확정본): 덮어쓰기 방지 → MINUTES_ALREADY_EXISTS(409)
     * - draft/failed: 같은 레코드를 generating으로 되돌려 재생성한다.
     *   (회의 중 만든 초안을 종료 후 전체 로그로 재생성하거나, 실패분 재시도)
     */
    const existing = await prisma.minutes.findUnique({
      where: { meetingId: meeting_id },
      select: { id: true, status: true, title: true },
    });

    if (existing) {
      if (existing.status === 'generating') {
        throw new AppError('MINUTES_GENERATING');
      }

      if (existing.status === 'confirmed') {
        throw new AppError('MINUTES_ALREADY_EXISTS');
      }
    }

    /*
     * 재생성 시 본문(contentMd)은 비우지 않는다. 워커가 성공 시 덮어쓰므로
     * 비울 필요가 없고, 미리 비우면 큐 등록 실패 시 기존 초안이 유실된다.
     * 생성 중에는 기존 본문이 잠시 남아 있다가 완료 시 교체된다.
     */
    const tempMinutes = existing
      ? await prisma.minutes.update({
          where: { id: existing.id },
          data: { title: finalTitle, status: 'generating' },
        })
      : await this.createGeneratingMinutes(
          roomId,
          authorId,
          meeting_id,
          finalTitle,
        );

    try {
      await addJob('minutes-generation', {
        minutesId: tempMinutes.id,
        meetingId: meeting_id,
        roomId,
        // 사용자가 지정한 제목(없으면 null). 워커가 AI 생성 제목과 구분하는 데 사용
        userTitle: title ?? null,
      });
    } catch (error) {
      /*
       * 큐 등록 실패 시: 신규 레코드는 삭제(고아 방지),
       * 재생성 레코드는 기존 상태/제목으로 정확히 복구해 초안을 보존한다.
       */
      if (existing) {
        await prisma.minutes
          .update({
            where: { id: tempMinutes.id },
            data: { status: existing.status, title: existing.title },
          })
          .catch(() => {});
      } else {
        await prisma.minutes.delete({ where: { id: tempMinutes.id } });
      }
      throw error;
    }

    return {
      id: tempMinutes.id,
      room_id: tempMinutes.roomId,
      meeting_id: tempMinutes.meetingId,
      author_id: tempMinutes.authorId,
      title: tempMinutes.title,
      type: tempMinutes.type,
      // 신규는 null, 재생성(draft 초안)이면 기존 본문이 잠시 유지됨
      content_md: tempMinutes.contentMd,
      action_items: tempMinutes.actionItems,
      status: tempMinutes.status, // "generating"
      linked_issue_numbers: tempMinutes.linkedIssueNumbers,
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
