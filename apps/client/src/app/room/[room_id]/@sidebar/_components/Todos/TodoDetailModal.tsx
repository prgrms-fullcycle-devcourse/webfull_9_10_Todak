'use client';

import {
  createTodoComment,
  createTodoLabel,
  createTodoReaction,
  deleteTodoComment,
  deleteTodoLabel,
  fetchTodo,
  fetchTodoComments,
  fetchTodoEvents,
  fetchTodoLabels,
  fetchTodoMilestones,
  updateTodo,
  updateTodoComment,
  updateTodoLabel,
} from '@/services/todos/api';
import type {
  Todo,
  TodoEvent,
  TodoLabel,
  TodoReaction,
  TodoReactionContent,
  UpdateTodoPayload,
} from '@/services/todos/api';
import { useSpaceStore } from '@/store/useSpaceStore';
import { useTodoListStore } from '@/store/useTodoListStore';
import { Button, Chip, Dropdown, Input, Modal } from '@heroui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

const MarkdownPreview = dynamic(
  () => import('@uiw/react-md-editor').then(mod => mod.default.Markdown),
  { ssr: false },
);

const REACTION_OPTIONS: { content: TodoReactionContent; label: string }[] = [
  { content: '+1', label: '👍' },
  { content: '-1', label: '👎' },
  { content: 'laugh', label: '😁' },
  { content: 'hooray', label: '🎉' },
  { content: 'confused', label: '😕' },
  { content: 'heart', label: '❤️' },
  { content: 'rocket', label: '🚀' },
  { content: 'eyes', label: '👀' },
];

type DeleteConfirmation =
  | { id: number; name: string; type: 'comment' }
  | { name: string; type: 'label' };

export default function TodoDetailModal() {
  const modalContent = useTodoListStore(state => state.modalContent);

  if (!modalContent) return null;

  return (
    <TodoDetailModalContent key={modalContent.id} modalContent={modalContent} />
  );
}

function TodoDetailModalContent({ modalContent }: { modalContent: Todo }) {
  const queryClient = useQueryClient();
  const setModalContent = useTodoListStore(state => state.setModalContent);
  const setIsModalOpen = useTodoListStore(state => state.setIsModalOpen);
  const isOpen = useTodoListStore(state => state.isOpen);
  const myChar = useSpaceStore(state => state.myChar);
  const [titleInput, setTitleInput] = useState<string | null>(null);
  const [bodyInput, setBodyInput] = useState<string | null>(null);
  const [isEditingTodo, setIsEditingTodo] = useState(false);
  const [isDoneInput, setIsDoneInput] = useState<boolean | null>(null);
  const [selectedLabelsInput, setSelectedLabelsInput] = useState<
    string[] | null
  >(null);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('ededed');
  const [editingLabelName, setEditingLabelName] = useState<string | null>(null);
  const [labelEditName, setLabelEditName] = useState('');
  const [labelEditColor, setLabelEditColor] = useState('');
  const [commentInput, setCommentInput] = useState('');
  const [editingCommentID, setEditingCommentID] = useState<number | null>(null);
  const [commentEditInput, setCommentEditInput] = useState('');
  const [reactionCountsByTarget, setReactionCountsByTarget] = useState<
    Record<string, Partial<Record<TodoReactionContent, number>>>
  >({});
  const [deleteConfirmation, setDeleteConfirmation] =
    useState<DeleteConfirmation | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const roomID = modalContent.room_id;
  const todoID = modalContent.id;

  const todoDetailQuery = useQuery({
    queryKey: ['todos', roomID, todoID],
    queryFn: () => fetchTodo(roomID, todoID),
    enabled: isOpen && roomID !== '' && todoID !== '',
  });

  const detailTodo = todoDetailQuery.data?.todo ?? modalContent;
  const titleValue = titleInput ?? detailTodo.title;
  const bodyValue = bodyInput ?? detailTodo.body ?? '';
  const isDoneValue = isDoneInput ?? detailTodo.is_done;
  const selectedLabels = selectedLabelsInput ?? detailTodo.labels;
  const assigneeName = detailTodo.assignee?.github_username ?? '미지정';
  const issueLabel =
    detailTodo.github_issue_number !== null
      ? `#${detailTodo.github_issue_number}`
      : '연결 없음';
  const status = getTodoStatusMeta(isDoneValue);
  const isAssignedToMe =
    detailTodo.assignee !== null &&
    (detailTodo.assignee.id === myChar.id ||
      detailTodo.assignee.github_username === myChar.githubUsername);
  const canEdit = isOpen && isAssignedToMe;
  const canComment = isOpen && detailTodo.github_issue_number !== null;

  const labelsQuery = useQuery({
    queryKey: ['todos', roomID, 'labels'],
    queryFn: () => fetchTodoLabels(roomID),
    enabled: isOpen && roomID !== '',
  });

  const commentsQuery = useQuery({
    queryKey: ['todos', roomID, todoID, 'comments'],
    queryFn: () => fetchTodoComments(roomID, todoID),
    enabled: isOpen && roomID !== '' && todoID !== '',
  });

  const eventsQuery = useQuery({
    queryKey: ['todos', roomID, todoID, 'events'],
    queryFn: () => fetchTodoEvents(roomID, todoID),
    enabled: isOpen && roomID !== '' && todoID !== '',
  });

  const milestonesQuery = useQuery({
    queryKey: ['todos', roomID, 'milestones'],
    queryFn: () => fetchTodoMilestones(roomID),
    enabled: isOpen && roomID !== '',
  });

  const availableLabels = useMemo(() => {
    const fetched = labelsQuery.data?.labels ?? [];
    const missingLabels = selectedLabels
      .filter(label => !fetched.some(item => item.name === label))
      .map<TodoLabel>(label => ({
        color: 'ededed',
        description: null,
        name: label,
      }));

    return [...fetched, ...missingLabels];
  }, [labelsQuery.data?.labels, selectedLabels]);
  const issueReactionCounts = mergeReactionCounts(
    countReactions(detailTodo.reactions),
    reactionCountsByTarget.issue,
  );

  const invalidateTodoQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['todos', roomID] });
    queryClient.invalidateQueries({ queryKey: ['todos', roomID, 'me'] });
    queryClient.invalidateQueries({ queryKey: ['my-todos', roomID] });
  };

  const updateTodoMutation = useMutation({
    mutationFn: (payload: UpdateTodoPayload) =>
      updateTodo(roomID, todoID, payload),
    onError: () => setActionMessage('To-Do 수정 중 오류가 발생했습니다.'),
    onSuccess: response => {
      queryClient.setQueryData(['todos', roomID, todoID], response);
      setModalContent(response.todo);
      invalidateTodoQueries();
      setActionMessage('To-Do가 업데이트되었습니다.');
    },
  });

  const createLabelMutation = useMutation({
    mutationFn: () =>
      createTodoLabel(roomID, {
        color: stripHexPrefix(newLabelColor),
        name: newLabelName.trim(),
      }),
    onSuccess: response => {
      queryClient.invalidateQueries({ queryKey: ['todos', roomID, 'labels'] });
      const nextLabels = [...new Set([...selectedLabels, response.label.name])];
      setSelectedLabelsInput(nextLabels);
      updateTodoMutation.mutate({ labels: nextLabels });
      setNewLabelName('');
      setNewLabelColor('ededed');
    },
  });

  const updateLabelMutation = useMutation({
    mutationFn: ({
      color,
      labelName,
      name,
    }: {
      color: string;
      labelName: string;
      name: string;
    }) =>
      updateTodoLabel(roomID, labelName, {
        color: stripHexPrefix(color) || undefined,
        new_name: name.trim() || undefined,
      }),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['todos', roomID, 'labels'] });
      if (
        variables.labelName !== null &&
        variables.labelName !== response.label.name
      ) {
        const nextLabels = selectedLabels.map(label =>
          label === variables.labelName ? response.label.name : label,
        );
        setSelectedLabelsInput(nextLabels);
        updateTodoMutation.mutate({ labels: nextLabels });
      }
      setEditingLabelName(null);
    },
  });

  const deleteLabelMutation = useMutation({
    mutationFn: (labelName: string) => deleteTodoLabel(roomID, labelName),
    onSuccess: (_response, labelName) => {
      queryClient.invalidateQueries({ queryKey: ['todos', roomID, 'labels'] });
      const nextLabels = selectedLabels.filter(label => label !== labelName);
      setSelectedLabelsInput(nextLabels);
      updateTodoMutation.mutate({ labels: nextLabels });
    },
  });

  const createCommentMutation = useMutation({
    mutationFn: () =>
      createTodoComment(roomID, todoID, { body: commentInput.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['todos', roomID, todoID, 'comments'],
      });
      setCommentInput('');
    },
  });

  const updateCommentMutation = useMutation({
    mutationFn: () => {
      if (editingCommentID === null) {
        throw new Error('수정할 댓글이 선택되지 않았습니다.');
      }

      return updateTodoComment(roomID, todoID, String(editingCommentID), {
        body: commentEditInput.trim(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['todos', roomID, todoID, 'comments'],
      });
      setEditingCommentID(null);
      setCommentEditInput('');
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentID: number) =>
      deleteTodoComment(roomID, todoID, String(commentID)),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ['todos', roomID, todoID, 'comments'],
      }),
  });

  const createReactionMutation = useMutation({
    mutationFn: ({ content }: { content: TodoReactionContent }) =>
      createTodoReaction(roomID, todoID, { content }),
  });

  if (typeof document === 'undefined') {
    return null;
  }

  const handleCommitTodoBody = () => {
    if (!canEdit || updateTodoMutation.isPending) {
      return;
    }

    const nextTitle = titleValue.trim();
    const nextBody = bodyValue.trim() || null;
    const currentBody = detailTodo.body?.trim() || null;

    if (nextTitle === '') {
      setTitleInput(detailTodo.title);
      setActionMessage('제목은 비워둘 수 없습니다.');
      return;
    }

    if (nextTitle === detailTodo.title && nextBody === currentBody) {
      setIsEditingTodo(false);
      setTitleInput(null);
      setBodyInput(null);
      return;
    }

    updateTodoMutation.mutate(
      {
        body: nextBody,
        title: nextTitle,
      },
      {
        onSuccess: () => {
          setIsEditingTodo(false);
          setTitleInput(null);
          setBodyInput(null);
        },
      },
    );
  };

  const handleEditTodo = () => {
    if (!canEdit || updateTodoMutation.isPending) return;

    setTitleInput(detailTodo.title);
    setBodyInput(detailTodo.body ?? '');
    setIsEditingTodo(true);
  };

  const handleToggleLabel = (labelName: string) => {
    if (!canEdit) return;

    const nextLabels = selectedLabels.includes(labelName)
      ? selectedLabels.filter(label => label !== labelName)
      : [...selectedLabels, labelName];

    setSelectedLabelsInput(nextLabels);
    updateTodoMutation.mutate({ labels: nextLabels });
  };

  const updateReactionCount = (
    targetKey: string,
    content: TodoReactionContent,
    delta: 1 | -1,
  ) => {
    setReactionCountsByTarget(current => {
      const nextCount = Math.max(
        (current[targetKey]?.[content] ?? 0) + delta,
        0,
      );
      return {
        ...current,
        [targetKey]: {
          ...current[targetKey],
          [content]: nextCount,
        },
      };
    });
  };

  const handleReact = (targetKey: string, content: TodoReactionContent) => {
    updateReactionCount(targetKey, content, 1);

    createReactionMutation.mutate(
      { content },
      {
        onError: () => {
          updateReactionCount(targetKey, content, -1);
          setActionMessage('리액션 추가에 실패했습니다.');
        },
      },
    );
  };

  const handleCommitLabelEdit = (labelName: string) => {
    const nextName = labelEditName.trim();
    const nextColor = labelEditColor.trim();

    if (
      !canEdit ||
      editingLabelName !== labelName ||
      nextName === '' ||
      !isSixDigitHexColor(nextColor) ||
      updateLabelMutation.isPending
    ) {
      return;
    }

    const originalLabel = availableLabels.find(
      label => label.name === labelName,
    );
    const originalColor = originalLabel?.color ?? '';

    if (nextName === labelName && nextColor === originalColor) {
      setEditingLabelName(null);
      return;
    }

    updateLabelMutation.mutate({
      color: nextColor,
      labelName,
      name: nextName,
    });
  };

  const handleCompleteTodo = () => {
    if (!canEdit || updateTodoMutation.isPending || isDoneValue) {
      return;
    }

    setIsDoneInput(true);
    updateTodoMutation.mutate({ is_done: true });
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmation === null) {
      return;
    }

    if (deleteConfirmation.type === 'comment') {
      deleteCommentMutation.mutate(deleteConfirmation.id, {
        onSuccess: () => setDeleteConfirmation(null),
      });
      return;
    }

    deleteLabelMutation.mutate(deleteConfirmation.name, {
      onSuccess: () => setDeleteConfirmation(null),
    });
  };

  const isDeleting =
    deleteCommentMutation.isPending || deleteLabelMutation.isPending;

  const modal = (
    <>
      <Modal.Backdrop isOpen={isOpen} onOpenChange={setIsModalOpen}>
        <Modal.Container>
          <Modal.Dialog className="flex max-h-[92vh] w-[calc(100vw-32px)] max-w-[1040px] flex-col overflow-hidden rounded-[24px] border border-border/80 bg-surface shadow-todak-panel">
            <Modal.Header className="flex items-start justify-between gap-5 border-b border-border px-5 py-5 sm:px-7">
              <div className="min-w-0 space-y-3">
                <p className="text-[12px] font-bold text-muted">GitHub Issue</p>
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                  <Modal.Heading className="min-w-0 text-[22px] font-black leading-tight text-foreground">
                    {detailTodo.title}
                  </Modal.Heading>
                  <span className="font-todak-mono text-[18px] font-bold text-todak-coral-500">
                    {issueLabel}
                  </span>
                </div>
                <p className="text-[11px] font-bold text-muted">
                  생성 {formatDateTime(detailTodo.created_at)} · 회의록{' '}
                  {detailTodo.minutes_id ?? '연결 없음'}
                </p>
                <div className="flex flex-wrap items-center gap-2 text-[12px] font-medium text-muted">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${status.className}`}
                  >
                    {status.label}
                  </span>
                  <span>
                    assigned to{' '}
                    <strong className="font-semibold text-foreground">
                      @{assigneeName}
                    </strong>
                  </span>
                </div>
              </div>
              <Modal.CloseTrigger />
            </Modal.Header>

            <Modal.Body className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_230px]">
                <main className="min-w-0 space-y-4">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border pb-3 text-[12px] font-semibold text-muted">
                    <span>
                      Comments{' '}
                      <strong className="text-foreground">
                        {commentsQuery.data?.comments.length ?? '-'}
                      </strong>
                    </span>
                    <span>
                      Events{' '}
                      <strong className="text-foreground">
                        {eventsQuery.data?.events.length ?? '-'}
                      </strong>
                    </span>
                    <span className="font-semibold text-emerald-600">
                      {canEdit ? 'Editable' : 'Read only'}
                    </span>
                  </div>

                  <section className="overflow-hidden rounded-xl border border-border bg-white">
                    <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-secondary px-4 py-3">
                      <p className="text-[12px] font-bold text-foreground">
                        To-Do body
                      </p>
                      {canEdit && (
                        <Button
                          aria-label={
                            isEditingTodo ? 'To-Do 저장하기' : 'To-Do 수정'
                          }
                          className={
                            isEditingTodo
                              ? 'h-10 rounded-lg bg-foreground px-4 text-[12px] font-bold text-background disabled:opacity-50'
                              : 'flex size-10 min-w-10 items-center justify-center rounded-lg border border-border bg-white p-0 text-muted hover:text-foreground'
                          }
                          isDisabled={updateTodoMutation.isPending}
                          onPress={
                            isEditingTodo
                              ? handleCommitTodoBody
                              : handleEditTodo
                          }
                          type="button"
                        >
                          {isEditingTodo ? (
                            updateTodoMutation.isPending ? (
                              '저장 중...'
                            ) : (
                              '저장하기'
                            )
                          ) : (
                            <PencilIcon />
                          )}
                        </Button>
                      )}
                      {!canEdit && (
                        <p className="text-[11px] font-bold text-muted">
                          담당자 본인만 수정할 수 있습니다.
                        </p>
                      )}
                    </header>
                    <div className="space-y-3 px-4 py-4">
                      {canEdit && isEditingTodo ? (
                        <>
                          <Input
                            className="h-10 rounded-xl border border-border bg-white px-3 text-[13px] font-bold text-foreground"
                            fullWidth
                            onChange={event =>
                              setTitleInput(event.target.value)
                            }
                            onKeyDown={event => {
                              if (
                                (event.metaKey || event.ctrlKey) &&
                                event.key === 'Enter'
                              ) {
                                event.preventDefault();
                                handleCommitTodoBody();
                              }
                            }}
                            value={titleValue}
                          />
                          <textarea
                            className="min-h-40 w-full resize-none rounded-xl border border-border bg-white px-3.5 py-3 text-[13px] font-medium leading-7 text-slate-600 outline-none"
                            onChange={event => setBodyInput(event.target.value)}
                            value={bodyValue}
                          />
                          <p className="text-[11px] font-bold text-muted">
                            Markdown 문법을 사용할 수 있습니다. 저장은 오른쪽의
                            저장하기 버튼을 눌러주세요.
                          </p>
                        </>
                      ) : (
                        <>
                          {detailTodo.body?.trim() ? (
                            <div data-color-mode="light">
                              <MarkdownPreview
                                className="bg-transparent text-[13px] font-normal leading-7 text-slate-600"
                                source={detailTodo.body}
                              />
                            </div>
                          ) : (
                            <p className="text-[13px] font-medium leading-7 text-muted">
                              등록된 To-Do 본문이 없습니다.
                            </p>
                          )}
                          <ReactionPicker
                            counts={issueReactionCounts}
                            onReact={content => handleReact('issue', content)}
                          />
                        </>
                      )}
                    </div>
                  </section>

                  <section className="overflow-hidden rounded-xl border border-border bg-white">
                    <header className="border-b border-border bg-surface-secondary px-4 py-3">
                      <p className="text-[12px] font-bold text-foreground">
                        Comments
                      </p>
                    </header>
                    <div className="space-y-3 px-4 py-4">
                      {commentsQuery.isPending && (
                        <p className="text-[13px] font-medium text-muted">
                          댓글을 불러오는 중입니다...
                        </p>
                      )}
                      {commentsQuery.data?.comments.length === 0 && (
                        <p className="text-[13px] font-medium text-muted">
                          등록된 댓글이 없습니다.
                        </p>
                      )}
                      {commentsQuery.data?.comments.map(comment => {
                        const isMyComment =
                          comment.authorLogin === myChar.githubUsername;
                        const commentReactionCounts = mergeReactionCounts(
                          countReactions(comment.reactions),
                          reactionCountsByTarget[`comment-${comment.id}`],
                        );

                        return (
                          <div
                            className="rounded-xl border border-border bg-surface-secondary px-4 py-3"
                            key={comment.id}
                          >
                            <div className="mb-2 flex items-center justify-between gap-2 text-[11px] font-bold text-muted">
                              <span>@{comment.authorLogin || 'unknown'}</span>
                              <span>{formatDateTime(comment.updatedAt)}</span>
                            </div>
                            {editingCommentID === comment.id ? (
                              <div className="space-y-2">
                                <textarea
                                  className="min-h-20 w-full resize-none rounded-lg border border-border bg-white px-3 py-2 text-[12px] font-medium outline-none"
                                  onChange={event =>
                                    setCommentEditInput(event.target.value)
                                  }
                                  value={commentEditInput}
                                />
                                <div className="flex gap-2">
                                  <Button
                                    className="h-8 rounded-lg bg-foreground px-3 text-[11px] font-bold text-background"
                                    isDisabled={
                                      !isMyComment ||
                                      commentEditInput.trim() === ''
                                    }
                                    onPress={() =>
                                      updateCommentMutation.mutate()
                                    }
                                    type="button"
                                  >
                                    저장
                                  </Button>
                                  <Button
                                    className="h-8 rounded-lg bg-white px-3 text-[11px] font-bold text-muted"
                                    onPress={() => setEditingCommentID(null)}
                                    type="button"
                                  >
                                    취소
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="whitespace-pre-wrap text-[13px] font-medium leading-6 text-slate-600">
                                  {comment.body}
                                </p>
                                <div className="mt-3 flex items-center justify-between gap-2">
                                  {!isMyComment ? (
                                    <ReactionPicker
                                      counts={commentReactionCounts}
                                      onReact={content =>
                                        handleReact(
                                          `comment-${comment.id}`,
                                          content,
                                        )
                                      }
                                    />
                                  ) : (
                                    <span />
                                  )}
                                  {isMyComment && (
                                    <div className="flex justify-end gap-1">
                                      <Button
                                        className="h-7 rounded-lg bg-white px-2 text-[10px] font-black text-muted"
                                        onPress={() => {
                                          setEditingCommentID(comment.id);
                                          setCommentEditInput(comment.body);
                                        }}
                                        type="button"
                                      >
                                        수정
                                      </Button>
                                      <Button
                                        className="h-7 rounded-lg bg-danger px-2 text-[10px] font-black text-white"
                                        onPress={() =>
                                          setDeleteConfirmation({
                                            id: comment.id,
                                            name: '댓글',
                                            type: 'comment',
                                          })
                                        }
                                        type="button"
                                      >
                                        삭제
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                      {canComment && (
                        <div className="space-y-2 border-t border-border pt-3">
                          <textarea
                            className="min-h-20 w-full resize-none rounded-xl border border-border bg-white px-3 py-2 text-[13px] font-medium outline-none"
                            onChange={event =>
                              setCommentInput(event.target.value)
                            }
                            placeholder="댓글을 입력하세요"
                            value={commentInput}
                          />
                          <Button
                            className="h-9 rounded-lg bg-foreground px-4 text-[12px] font-bold text-background disabled:opacity-50"
                            isDisabled={
                              createCommentMutation.isPending ||
                              commentInput.trim() === ''
                            }
                            onPress={() => createCommentMutation.mutate()}
                            type="button"
                          >
                            댓글 등록
                          </Button>
                        </div>
                      )}
                    </div>
                  </section>

                  <section className="rounded-xl border border-border bg-surface-secondary px-4 py-3">
                    <p className="text-[12px] font-bold text-foreground">
                      Timeline
                    </p>
                    <div className="mt-4">
                      {eventsQuery.isPending && (
                        <p className="text-[12px] font-bold text-muted">
                          이벤트를 불러오는 중입니다...
                        </p>
                      )}
                      {eventsQuery.data?.events.map((event, index, events) => (
                        <TimelineItem
                          event={event}
                          isLast={index === events.length - 1}
                          key={`${event.id}-${event.event}-${event.createdAt}`}
                        />
                      ))}
                      {eventsQuery.data?.events.length === 0 && (
                        <p className="text-[12px] font-bold text-muted">
                          이벤트가 없습니다.
                        </p>
                      )}
                    </div>
                  </section>

                  {actionMessage !== null && (
                    <section className="rounded-xl border border-border bg-surface-secondary px-4 py-3">
                      <p className="rounded-lg bg-white px-3 py-2 text-[12px] font-black text-todak-coral-500 shadow-sm">
                        {actionMessage}
                      </p>
                    </section>
                  )}
                </main>

                <aside className="space-y-4 text-[12px] font-bold text-muted">
                  <SidebarMeta title="Assignees">
                    <p className="break-words font-semibold leading-relaxed text-foreground">
                      @{assigneeName}
                    </p>
                  </SidebarMeta>

                  <section className="border-b border-border pb-4">
                    <Dropdown>
                      <Dropdown.Trigger
                        className="mb-2 rounded-md text-left text-[11px] font-bold text-slate-400 transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-todak-coral-300 disabled:cursor-default"
                        isDisabled={!canEdit}
                      >
                        <span>Labels</span>
                      </Dropdown.Trigger>
                      <Dropdown.Popover
                        className="w-[280px] rounded-xl border border-border bg-white p-3 shadow-xl"
                        placement="bottom end"
                      >
                        <LabelDropdown
                          availableLabels={availableLabels}
                          canEdit={canEdit}
                          createLabelMutationPending={
                            createLabelMutation.isPending
                          }
                          deleteLabelMutationPending={
                            deleteLabelMutation.isPending
                          }
                          editingLabelName={editingLabelName}
                          labelEditColor={labelEditColor}
                          labelEditName={labelEditName}
                          labelsPending={labelsQuery.isPending}
                          newLabelColor={newLabelColor}
                          newLabelName={newLabelName}
                          onCreateLabel={() => createLabelMutation.mutate()}
                          onDeleteLabel={labelName =>
                            setDeleteConfirmation({
                              name: labelName,
                              type: 'label',
                            })
                          }
                          onEditLabel={label => {
                            setEditingLabelName(label.name);
                            setLabelEditName(label.name);
                            setLabelEditColor(label.color);
                          }}
                          onCommitLabelEdit={handleCommitLabelEdit}
                          onLabelEditColorChange={setLabelEditColor}
                          onLabelEditNameChange={setLabelEditName}
                          onNewLabelColorChange={setNewLabelColor}
                          onNewLabelNameChange={setNewLabelName}
                          onToggleLabel={handleToggleLabel}
                          selectedLabels={selectedLabels}
                          updateLabelMutationPending={
                            updateLabelMutation.isPending
                          }
                        />
                      </Dropdown.Popover>
                    </Dropdown>
                    <LabelChips labels={selectedLabels} />
                  </section>

                  <SidebarMeta title="Branches">
                    <p className="break-words font-semibold leading-relaxed text-foreground">
                      No branch linked
                    </p>
                    <p className="mt-1 break-words font-medium leading-relaxed text-muted">
                      GitHub Issue {issueLabel}
                    </p>
                  </SidebarMeta>

                  <SidebarMeta title="Project">
                    <p className="break-words font-semibold leading-relaxed text-foreground">
                      No project
                    </p>
                  </SidebarMeta>

                  <SidebarMeta title="Milestones">
                    <InlineList
                      emptyText="No milestones"
                      items={
                        milestonesQuery.data?.milestones.map(
                          milestone => milestone.title,
                        ) ?? []
                      }
                    />
                  </SidebarMeta>

                  <section className="space-y-2 pt-1">
                    <Button
                      className="h-10 w-full rounded-lg bg-purple-600 text-[12px] font-bold text-white shadow-sm hover:bg-purple-700 disabled:opacity-50"
                      isDisabled={
                        !canEdit || updateTodoMutation.isPending || isDoneValue
                      }
                      onPress={handleCompleteTodo}
                      type="button"
                    >
                      {updateTodoMutation.isPending
                        ? '완료 처리 중...'
                        : isDoneValue
                          ? '완료된 To-Do'
                          : 'To-Do 완료하기'}
                    </Button>
                  </section>
                </aside>
              </div>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
      {deleteConfirmation !== null && (
        <DeleteConfirmationModal
          isOpen={deleteConfirmation !== null}
          isDeleting={isDeleting}
          itemName={deleteConfirmation.name}
          onCancel={() => setDeleteConfirmation(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </>
  );

  return createPortal(modal, document.body);
}

function PencilIcon() {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
      <path
        d="m14.7 6.3 3 3M5 19l3.6-.7L18.4 8.5a2.1 2.1 0 0 0-3-3l-9.8 9.8L5 19Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function DeleteConfirmationModal({
  isOpen,
  isDeleting,
  itemName,
  onCancel,
  onConfirm,
}: {
  isOpen: boolean;
  isDeleting: boolean;
  itemName: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal.Backdrop
      isOpen={isOpen}
      onOpenChange={nextOpen => {
        if (!nextOpen && !isDeleting) {
          onCancel();
        }
      }}
    >
      <Modal.Container>
        <Modal.Dialog className="w-full max-w-[360px] rounded-2xl border border-border bg-white px-5 py-5 shadow-xl">
          <Modal.Header className="flex items-start justify-between gap-4 px-0 pb-0 pt-0">
            <Modal.Heading className="text-[16px] font-black text-foreground">
              삭제하시겠습니까?
            </Modal.Heading>
            <Modal.CloseTrigger isDisabled={isDeleting} />
          </Modal.Header>
          <Modal.Body className="px-0 py-0">
            <p className="mt-2 text-[12px] font-semibold leading-5 text-muted">
              {itemName} 삭제 작업은 되돌릴 수 없습니다.
            </p>
          </Modal.Body>
          <Modal.Footer className="mt-5 flex justify-end gap-2 border-t border-border px-0 pb-0 pt-4">
            <Button
              className="h-9 rounded-lg border border-border bg-white px-4 text-[12px] font-bold text-foreground"
              isDisabled={isDeleting}
              onPress={onCancel}
              type="button"
              variant="ghost"
            >
              취소
            </Button>
            <Button
              className="h-9 rounded-lg bg-danger px-4 text-[12px] font-bold text-white disabled:opacity-50"
              isDisabled={isDeleting}
              onPress={onConfirm}
              type="button"
            >
              {isDeleting ? '삭제 중...' : '삭제하기'}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

function ReactionPicker({
  counts,
  onReact,
}: {
  counts: Partial<Record<TodoReactionContent, number>>;
  onReact: (content: TodoReactionContent) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Dropdown>
        <Dropdown.Trigger
          aria-label="리액션 추가"
          className="flex size-9 items-center justify-center rounded-full border border-slate-300 bg-surface-secondary text-[16px] font-black text-muted shadow-sm transition-colors hover:bg-white hover:text-foreground"
        >
          <span aria-hidden>☺</span>
        </Dropdown.Trigger>
        <Dropdown.Popover
          className="rounded-xl border border-slate-300 bg-black px-3 py-2 shadow-xl"
          placement="bottom start"
        >
          <div className="flex items-center gap-3">
            {REACTION_OPTIONS.map(reaction => (
              <button
                aria-label={`${reaction.content} 리액션 추가`}
                className="rounded-lg px-1.5 py-1 text-2xl leading-none transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-todak-coral-300"
                key={reaction.content}
                onClick={() => onReact(reaction.content)}
                type="button"
              >
                {reaction.label}
              </button>
            ))}
          </div>
        </Dropdown.Popover>
      </Dropdown>

      {REACTION_OPTIONS.filter(
        reaction => (counts[reaction.content] ?? 0) > 0,
      ).map(reaction => (
        <button
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-blue-500 bg-blue-500/10 px-3 text-[13px] font-black text-foreground transition-colors hover:bg-blue-500/15 disabled:opacity-50"
          key={reaction.content}
          onClick={() => onReact(reaction.content)}
          type="button"
        >
          <span className="text-base leading-none">{reaction.label}</span>
          <span>{counts[reaction.content]}</span>
        </button>
      ))}
    </div>
  );
}

function LabelDropdown({
  availableLabels,
  canEdit,
  createLabelMutationPending,
  deleteLabelMutationPending,
  editingLabelName,
  labelEditColor,
  labelEditName,
  labelsPending,
  newLabelColor,
  newLabelName,
  onCreateLabel,
  onCommitLabelEdit,
  onDeleteLabel,
  onEditLabel,
  onLabelEditColorChange,
  onLabelEditNameChange,
  onNewLabelColorChange,
  onNewLabelNameChange,
  onToggleLabel,
  selectedLabels,
  updateLabelMutationPending,
}: {
  availableLabels: TodoLabel[];
  canEdit: boolean;
  createLabelMutationPending: boolean;
  deleteLabelMutationPending: boolean;
  editingLabelName: string | null;
  labelEditColor: string;
  labelEditName: string;
  labelsPending: boolean;
  newLabelColor: string;
  newLabelName: string;
  onCreateLabel: () => void;
  onCommitLabelEdit: (labelName: string) => void;
  onDeleteLabel: (labelName: string) => void;
  onEditLabel: (label: TodoLabel) => void;
  onLabelEditColorChange: (value: string) => void;
  onLabelEditNameChange: (value: string) => void;
  onNewLabelColorChange: (value: string) => void;
  onNewLabelNameChange: (value: string) => void;
  onToggleLabel: (labelName: string) => void;
  selectedLabels: string[];
  updateLabelMutationPending: boolean;
}) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-black text-slate-400">Apply labels</p>
      <div className="max-h-52 space-y-1 overflow-y-auto pr-1">
        {labelsPending && (
          <p className="px-2 py-2 text-[12px] font-bold text-muted">
            라벨을 불러오는 중입니다...
          </p>
        )}
        {availableLabels.length === 0 && !labelsPending && (
          <p className="px-2 py-2 text-[12px] font-bold text-muted">
            라벨이 없습니다.
          </p>
        )}
        {availableLabels.map(label => (
          <div
            className="rounded-lg border border-transparent px-2 py-2 hover:border-border hover:bg-surface-secondary"
            key={label.name}
          >
            {editingLabelName === label.name ? (
              <div className="space-y-2">
                <Input
                  className="h-8 rounded-lg border border-border px-2 text-[12px] font-bold"
                  fullWidth
                  onBlur={() => onCommitLabelEdit(label.name)}
                  onChange={event => onLabelEditNameChange(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      onCommitLabelEdit(label.name);
                    }
                  }}
                  value={labelEditName}
                />
                <div className="grid grid-cols-[24px_1fr] items-center gap-2">
                  <ColorPreview color={labelEditColor} />
                  <Input
                    className="h-8 rounded-lg border border-border px-2 text-[12px] font-bold"
                    fullWidth
                    onBlur={() => onCommitLabelEdit(label.name)}
                    onChange={event =>
                      onLabelEditColorChange(event.target.value)
                    }
                    onKeyDown={event => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        onCommitLabelEdit(label.name);
                      }
                    }}
                    value={labelEditColor}
                  />
                </div>
                <p className="text-[10px] font-bold text-muted">
                  {updateLabelMutationPending
                    ? '수정 중...'
                    : '입력 후 Enter 또는 바깥 클릭 시 바로 반영됩니다.'}
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                  <input
                    checked={selectedLabels.includes(label.name)}
                    disabled={!canEdit}
                    onChange={() => onToggleLabel(label.name)}
                    type="checkbox"
                  />
                  <ColorPreview color={label.color} />
                  <span className="min-w-0 truncate text-[12px] font-bold text-foreground">
                    {label.name}
                  </span>
                </label>
                <div className="flex shrink-0 gap-1">
                  <button
                    className="rounded-md px-1.5 py-1 text-[10px] font-black text-muted hover:bg-white"
                    onClick={() => onEditLabel(label)}
                    type="button"
                  >
                    수정
                  </button>
                  <button
                    className="rounded-md px-1.5 py-1 text-[10px] font-black text-danger hover:bg-white disabled:opacity-50"
                    disabled={deleteLabelMutationPending}
                    onClick={() => onDeleteLabel(label.name)}
                    type="button"
                  >
                    삭제
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-3 space-y-2 border-t border-border pt-3">
        <p className="text-[11px] font-black text-slate-400">New label</p>
        <Input
          className="h-8 rounded-lg border border-border px-2 text-[12px] font-bold"
          fullWidth
          onChange={event => onNewLabelNameChange(event.target.value)}
          placeholder="label name"
          value={newLabelName}
        />
        <div className="grid grid-cols-[24px_1fr] items-center gap-2">
          <ColorPreview color={newLabelColor} />
          <Input
            className="h-8 rounded-lg border border-border px-2 text-[12px] font-bold"
            fullWidth
            onChange={event => onNewLabelColorChange(event.target.value)}
            placeholder="ededed"
            value={newLabelColor}
          />
        </div>
        <Button
          className="h-8 w-full rounded-lg bg-todak-coral-500 text-[11px] font-bold text-white disabled:opacity-50"
          isDisabled={
            createLabelMutationPending ||
            newLabelName.trim() === '' ||
            !isSixDigitHexColor(newLabelColor)
          }
          onPress={onCreateLabel}
          type="button"
        >
          라벨 생성
        </Button>
      </div>
    </div>
  );
}

function SidebarMeta({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="border-b border-border pb-4 last:border-b-0">
      <h3 className="mb-2 text-[11px] font-bold text-slate-400">{title}</h3>
      {children}
    </section>
  );
}

function InlineList({
  emptyText,
  items,
}: {
  emptyText: string;
  items: string[];
}) {
  return (
    <p className="break-words font-semibold leading-relaxed text-foreground">
      {items.length > 0 ? items.join(', ') : emptyText}
    </p>
  );
}

function LabelChips({ labels }: { labels: string[] }) {
  if (labels.length === 0) {
    return (
      <p className="break-words font-medium leading-relaxed text-muted">
        None yet
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {labels.map(label => (
        <Chip
          className="h-6 max-w-full rounded-md bg-surface-secondary px-2 text-[11px] font-semibold text-foreground"
          key={label}
          size="sm"
          variant="soft"
        >
          <span className="block max-w-[160px] truncate">{label}</span>
        </Chip>
      ))}
    </div>
  );
}

function countReactions(reactions?: TodoReaction[]) {
  return (reactions ?? []).reduce<Partial<Record<TodoReactionContent, number>>>(
    (counts, reaction) => ({
      ...counts,
      [reaction.content]: (counts[reaction.content] ?? 0) + 1,
    }),
    {},
  );
}

function mergeReactionCounts(
  baseCounts: Partial<Record<TodoReactionContent, number>>,
  optimisticCounts?: Partial<Record<TodoReactionContent, number>>,
) {
  if (optimisticCounts === undefined) {
    return baseCounts;
  }

  return REACTION_OPTIONS.reduce<Partial<Record<TodoReactionContent, number>>>(
    (counts, reaction) => {
      const count =
        (baseCounts[reaction.content] ?? 0) +
        (optimisticCounts[reaction.content] ?? 0);

      return count > 0
        ? {
            ...counts,
            [reaction.content]: count,
          }
        : counts;
    },
    {},
  );
}

function TimelineItem({
  event,
  isLast,
}: {
  event: TodoEvent;
  isLast: boolean;
}) {
  const actorName = event.actorLogin || 'unknown';
  const description = getTimelineDescription(event);

  return (
    <div className="relative grid grid-cols-[40px_1fr] gap-3 pb-5 last:pb-0">
      {!isLast && (
        <span
          aria-hidden
          className="absolute left-5 top-10 h-[calc(100%-2.5rem)] w-px bg-border"
        />
      )}
      <div className="relative z-10 flex size-10 items-center justify-center rounded-full bg-slate-200 text-[14px] font-black text-slate-500">
        <TimelineIcon eventName={event.event} />
      </div>
      <div className="min-w-0 pt-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] font-semibold leading-6 text-muted">
          {event.actorAvatarUrl ? (
            <Image
              alt={actorName}
              className="size-5 rounded-full"
              height={20}
              src={event.actorAvatarUrl}
              width={20}
            />
          ) : (
            <span className="size-5 rounded-full bg-slate-200" />
          )}
          <span className="font-black text-foreground">{actorName}</span>
          {description}
          <time
            className="font-semibold text-muted underline decoration-slate-300 underline-offset-4"
            dateTime={event.createdAt}
          >
            {formatRelativeTime(event.createdAt)}
          </time>
        </div>
      </div>
    </div>
  );
}

function TimelineIcon({ eventName }: { eventName: string }) {
  const icon = getTimelineIcon(eventName);

  return <span aria-hidden>{icon}</span>;
}

function getTimelineDescription(event: TodoEvent) {
  const label = event.label;
  const assignee = event.assignee;
  const milestone = event.milestone;
  const projectName = event.project_card?.project_name;
  const columnName = event.project_card?.column_name;
  const previousColumnName = event.project_card?.previous_column_name;
  const projectField = event.project_field;
  const issueType = event.issue_type?.name;

  switch (event.event) {
    case 'assigned':
      return (
        <>
          <span>assigned</span>
          {assignee && <TimelineStrong>@{assignee}</TimelineStrong>}
        </>
      );
    case 'unassigned':
      return (
        <>
          <span>unassigned</span>
          {assignee && <TimelineStrong>@{assignee}</TimelineStrong>}
        </>
      );
    case 'self_assigned':
      return <span>self-assigned this</span>;
    case 'labeled':
      return (
        <>
          <span>added</span>
          {label ? <TimelineLabelChip label={label} /> : <span>a label</span>}
        </>
      );
    case 'unlabeled':
      return (
        <>
          <span>removed</span>
          {label ? <TimelineLabelChip label={label} /> : <span>a label</span>}
        </>
      );
    case 'milestoned':
      return (
        <>
          <span>added this to the</span>
          <TimelineStrong>{milestone ?? 'milestone'}</TimelineStrong>
          <span>milestone</span>
        </>
      );
    case 'demilestoned':
      return (
        <>
          <span>removed this from the</span>
          <TimelineStrong>{milestone ?? 'milestone'}</TimelineStrong>
          <span>milestone</span>
        </>
      );
    case 'renamed':
      return (
        <>
          <span>changed the title from</span>
          <TimelineStrong>
            {event.rename?.from ?? 'previous title'}
          </TimelineStrong>
          <span>to</span>
          <TimelineStrong>{event.rename?.to ?? 'new title'}</TimelineStrong>
        </>
      );
    case 'closed':
      return <span>closed this</span>;
    case 'reopened':
      return <span>reopened this</span>;
    case 'commented':
      return <span>commented</span>;
    case 'added_to_project':
      return (
        <>
          <span>added this to</span>
          <TimelineProjectName>
            {projectName ?? 'a project'}
          </TimelineProjectName>
        </>
      );
    case 'moved_columns_in_project':
      return (
        <>
          <span>moved this</span>
          {previousColumnName && (
            <>
              <span>from</span>
              <TimelineStrong>{previousColumnName}</TimelineStrong>
            </>
          )}
          {columnName && (
            <>
              <span>to</span>
              <TimelineStrong>{columnName}</TimelineStrong>
            </>
          )}
          {projectName && (
            <>
              <span>in</span>
              <TimelineProjectName>{projectName}</TimelineProjectName>
            </>
          )}
        </>
      );
    case 'project_field_changed':
    case 'project_v2_item_field_value_changed':
      return (
        <>
          <span>updated</span>
          <TimelineStrong>
            {projectField?.field_name ?? 'a project field'}
          </TimelineStrong>
          {projectField?.to && <TimelineLabelChip label={projectField.to} />}
          {projectField?.project_name && (
            <>
              <span>in</span>
              <TimelineProjectName>
                {projectField.project_name}
              </TimelineProjectName>
            </>
          )}
        </>
      );
    case 'converted_to_issue':
      return <span>converted this to an issue</span>;
    case 'issue_type_added':
      return (
        <>
          <span>added the</span>
          <TimelineLabelChip
            color={event.issue_type?.color}
            label={issueType ?? 'issue'}
          />
          <span>issue type</span>
        </>
      );
    case 'issue_type_changed':
      return (
        <>
          <span>updated issue type to</span>
          <TimelineLabelChip
            color={event.issue_type?.color}
            label={issueType ?? 'issue'}
          />
        </>
      );
    default:
      return <span>{humanizeEventName(event.event)}</span>;
  }
}

function TimelineStrong({ children }: { children: React.ReactNode }) {
  return <span className="font-black text-foreground">{children}</span>;
}

function TimelineProjectName({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1 font-black text-foreground underline decoration-slate-300 underline-offset-4">
      <span className="grid size-4 grid-cols-2 gap-px rounded-[3px] border border-slate-400 p-0.5">
        <span className="bg-slate-400" />
        <span className="bg-slate-400" />
        <span className="bg-slate-400" />
        <span className="bg-slate-400" />
      </span>
      <span className="truncate">{children}</span>
    </span>
  );
}

function TimelineLabelChip({
  color,
  label,
}: {
  color?: string;
  label: string;
}) {
  const normalizedColor = normalizeHexColor(color ?? 'ededed');

  return (
    <span
      className="inline-flex max-w-[180px] items-center rounded-full border px-2 py-0.5 text-[12px] font-black"
      style={{
        backgroundColor: `#${normalizedColor}22`,
        borderColor: `#${normalizedColor}`,
        color: getReadableTextColor(normalizedColor),
      }}
    >
      <span className="truncate">{label}</span>
    </span>
  );
}

function getTimelineIcon(eventName: string) {
  if (eventName.includes('assign')) return 'A';
  if (eventName.includes('label')) return 'L';
  if (eventName.includes('project') || eventName.includes('column')) return 'P';
  if (eventName.includes('milestone')) return 'M';
  if (eventName.includes('close')) return 'C';
  if (eventName.includes('reopen')) return 'R';
  if (eventName.includes('comment')) return 'C';
  if (eventName.includes('type')) return 'T';
  return 'I';
}

function humanizeEventName(eventName: string) {
  return eventName.replaceAll('_', ' ');
}

function ColorPreview({ color }: { color: string }) {
  return (
    <span
      aria-label={`#${normalizeHexColor(color)}`}
      className="size-5 rounded-full border border-border shadow-sm"
      style={{ backgroundColor: `#${normalizeHexColor(color)}` }}
      title={`#${normalizeHexColor(color)}`}
    />
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatRelativeTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const diffInSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const divisions = [
    { amount: 60, unit: 'second' },
    { amount: 60, unit: 'minute' },
    { amount: 24, unit: 'hour' },
    { amount: 7, unit: 'day' },
    { amount: 4.34524, unit: 'week' },
    { amount: 12, unit: 'month' },
    { amount: Number.POSITIVE_INFINITY, unit: 'year' },
  ] as const;
  let duration = diffInSeconds;

  for (const division of divisions) {
    if (Math.abs(duration) < division.amount) {
      return new Intl.RelativeTimeFormat('ko-KR', {
        numeric: 'auto',
      }).format(Math.round(duration), division.unit);
    }

    duration /= division.amount;
  }

  return formatDateTime(value);
}

function normalizeHexColor(color: string) {
  const normalized = color.trim().replace(/^#/, '');

  return /^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(normalized)
    ? normalized
    : 'ededed';
}

function isSixDigitHexColor(color: string) {
  return /^[0-9a-fA-F]{6}$/.test(stripHexPrefix(color));
}

function stripHexPrefix(color: string) {
  return color.trim().replace(/^#/, '');
}

function getReadableTextColor(color: string) {
  const hex =
    color.length === 3
      ? color
          .split('')
          .map(value => `${value}${value}`)
          .join('')
      : color;
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

  return luminance > 0.55 ? '#1f2937' : `#${hex}`;
}

function getTodoStatusMeta(isDone: boolean) {
  return isDone
    ? {
        className: 'bg-emerald-50 text-emerald-600',
        label: 'DONE',
      }
    : {
        className: 'bg-orange-50 text-orange-600',
        label: 'OPEN',
      };
}
