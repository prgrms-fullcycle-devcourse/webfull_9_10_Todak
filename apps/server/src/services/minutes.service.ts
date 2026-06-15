import {
  CreateManualMinutesBody,
  GenerateAiMinutesBody,
  GetMinutesListQuery,
  RefineMinutesBody,
  UpdateMinutesBody,
} from '../api/minutes/minutes.schema.js';
import { AppError } from '../errors/AppError.js';
import { Prisma } from '../generated/prisma/client/index.js';
import { addJob } from '../jobs/queues/index.js';
import { prisma } from '../lib/prisma.js';

import { refineMinutesContent } from './anthropic.service.js';
import {
  createNotifications,
  getMeetingParticipantIds,
} from './notifications.service.js';

/*
 * 프리셋 다듬기 지시문(서버 소유). 프론트는 refine_type 만 보내고,
 * 실제 지시 문구는 여기서 관리해 프롬프트 개선이 백엔드에 집중되게 한다.
 */
const REFINE_INSTRUCTIONS: Record<'SHORTEN' | 'BULLET', string> = {
  SHORTEN:
    '전체 내용을 핵심만 남겨 훨씬 짧고 간결하게 요약해줘. 중요한 결정사항과 액션 아이템은 빠뜨리지 마.',
  BULLET:
    '전체 내용을 글머리 기호(bullet points) 위주의 개조식으로 정리해줘. 장황한 문장은 짧은 항목으로 변환해.',
};

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
    const { type, status, page, limit } = query;

    const whereCondition: Prisma.MinutesWhereInput = { roomId };
    if (type) {
      whereCondition.type = type;
    }

    if (status !== undefined) {
      whereCondition.status = status;
    } else {
      /*
       * 기본 목록에서는 생성 실패한 회의록을 제외한다(전이/에러 상태).
       * 특정 상태를 보고 싶으면 status 쿼리로 명시한다(status=failed 도 가능).
       */
      whereCondition.status = { not: 'failed' };
    }

    const skip = (page - 1) * limit;

    /*
     * 멤버 검증 / 카운트 / 목록을 병렬 조회해 왕복을 줄인다.
     * 비멤버면 조회 결과를 버리고 기존과 동일하게 ROOM_NOT_FOUND 를 던진다(정보 노출 없음).
     */
    const [membership, totalCount, minutesData] = await Promise.all([
      prisma.roomMember.findFirst({
        where: { roomId, userId },
        select: { id: true },
      }),
      prisma.minutes.count({ where: whereCondition }),
      prisma.minutes.findMany({
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
      }),
    ]);

    if (membership === null) {
      throw new AppError('ROOM_NOT_FOUND');
    }

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
      action_items: newMinutes.actionItems ?? [],
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
      action_items: tempMinutes.actionItems ?? [],
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

    // 1. 회의록 단건 조회 (author 는 노출 필드만 select — accessToken 등 민감컬럼 미조회)
    const minutes = await prisma.minutes.findFirst({
      where: {
        id: minutesId,
        roomId,
      },
      include: {
        author: {
          select: {
            id: true,
            githubUsername: true,
            avatarUrl: true,
          },
        },
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
      action_items: minutes.actionItems ?? [],
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

    /*
     * 알림(영속): draft → confirmed 로 '확정'될 때만, 회의 참여자에게(확정자 제외).
     * 수동 회의록(meetingId null)은 참여자 개념이 없어 알림을 보내지 않는다.
     */
    if (
      dto.status === 'confirmed' &&
      existingMinutes.status !== 'confirmed' &&
      existingMinutes.meetingId !== null
    ) {
      const participantIds = await getMeetingParticipantIds(
        existingMinutes.meetingId,
      );
      await createNotifications(
        participantIds.filter(id => id !== userId),
        {
          roomId,
          type: 'minutes_confirmed',
          message: `회의록 확정: ${updated.title}`,
          link: `/room/${roomId}`,
        },
      );
    }

    return {
      id: updated.id,
      room_id: updated.roomId,
      title: updated.title,
      type: updated.type,
      content_md: updated.contentMd,
      action_items: updated.actionItems ?? [],
      status: updated.status,
      linked_issue_numbers: updated.linkedIssueNumbers,
      updated_at: updated.updatedAt.toISOString(),
    };
  }

  /*
   * 기존 회의록 본문을 지시사항대로 AI가 재가공해 즉시 반환(동기).
   * DB에는 저장하지 않으며, 사용자가 확인 후 PATCH 로 확정한다.
   */
  public async refineMinutes(
    roomId: string,
    userId: string,
    minutesId: string,
    body: RefineMinutesBody,
  ) {
    await this.assertRoomMember(roomId, userId);

    const minutes = await prisma.minutes.findFirst({
      where: { id: minutesId, roomId },
      select: { id: true, contentMd: true, status: true },
    });

    if (!minutes) {
      throw new AppError('MINUTES_NOT_FOUND');
    }

    // 생성 중이면 본문이 불완전하므로 다듬기 불가
    if (minutes.status === 'generating') {
      throw new AppError('MINUTES_GENERATING');
    }

    if (minutes.contentMd === null || minutes.contentMd.trim() === '') {
      throw new AppError('MINUTES_NO_CONTENT');
    }

    let instruction: string;
    if (body.refine_type === 'CUSTOM') {
      // 스키마에서 보장되지만 타입 안전을 위해 한 번 더 방어
      if (body.custom_message === undefined) {
        throw new AppError('BAD_REQUEST');
      }
      instruction = body.custom_message;
    } else {
      instruction = REFINE_INSTRUCTIONS[body.refine_type];
    }

    const refinedContentMd = await refineMinutesContent(
      minutes.contentMd,
      instruction,
    );

    return {
      id: minutes.id,
      refined_content_md: refinedContentMd,
    };
  }
}
