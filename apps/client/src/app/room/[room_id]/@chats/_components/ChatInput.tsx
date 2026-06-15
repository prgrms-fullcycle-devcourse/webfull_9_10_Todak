'use client';

import { useRef, useState } from 'react';
import { Button, Input } from '@heroui/react';
import { uploadChatAttachment } from '@/services/chats/api';
import type { PendingAttachment } from '@/services/chats/model';

interface ChatInputProps {
  roomId: string;
  onSend: (content: string, attachments?: PendingAttachment[]) => Promise<void>;
}

// 서버 정책과 동일하게 맞춘 허용 형식/용량 (빠른 피드백용 — 서버에서도 재검증됨)
const ALLOWED_MIME = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'application/pdf',
];
const MB = 1024 * 1024;
const MAX_IMAGE_SIZE = 10 * MB;
const MAX_FILE_SIZE = 25 * MB;
const MAX_ATTACHMENTS = 10;

// 업로드 진행 상태를 들고 있는 로컬 항목
interface PendingItem {
  id: string;
  fileName: string;
  mime: string;
  size: number;
  isImage: boolean;
  previewUrl?: string; // 이미지 미리보기용 objectURL
  status: 'uploading' | 'done' | 'error';
  s3Key?: string;
}

function validateFile(file: File): string | null {
  if (!ALLOWED_MIME.includes(file.type)) {
    return '이미지 또는 PDF만 첨부할 수 있어요.';
  }
  const max = file.type.startsWith('image/') ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;
  if (file.size > max) {
    return `파일이 너무 커요. (이미지 ${MAX_IMAGE_SIZE / MB}MB · PDF ${MAX_FILE_SIZE / MB}MB 이하)`;
  }
  return null;
}

export default function ChatInput({ roomId, onSend }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasUploading = pending.some(p => p.status === 'uploading');
  const doneAttachments = pending.filter(
    (p): p is PendingItem & { s3Key: string } =>
      p.status === 'done' && !!p.s3Key,
  );
  const canSend =
    (input.trim().length > 0 || doneAttachments.length > 0) &&
    !hasUploading &&
    !sending;

  const handleFiles = async (fileList: FileList) => {
    setError(null);
    const files = Array.from(fileList);

    for (const file of files) {
      if (pending.length >= MAX_ATTACHMENTS) {
        setError(`첨부는 최대 ${MAX_ATTACHMENTS}개까지 가능해요.`);
        break;
      }

      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        continue;
      }

      const id = crypto.randomUUID();
      const isImage = file.type.startsWith('image/');
      const previewUrl = isImage ? URL.createObjectURL(file) : undefined;

      setPending(prev => [
        ...prev,
        {
          id,
          fileName: file.name,
          mime: file.type,
          size: file.size,
          isImage,
          previewUrl,
          status: 'uploading',
        },
      ]);

      try {
        const { s3Key } = await uploadChatAttachment(roomId, file);
        setPending(prev =>
          prev.map(p => (p.id === id ? { ...p, status: 'done', s3Key } : p)),
        );
      } catch (err) {
        console.error('[upload error]', err);
        setError('업로드에 실패했어요. 다시 시도해주세요.');
        setPending(prev =>
          prev.map(p => (p.id === id ? { ...p, status: 'error' } : p)),
        );
      }
    }
  };

  const removePending = (id: string) => {
    setPending(prev => {
      const target = prev.find(p => p.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter(p => p.id !== id);
    });
  };

  const handleSend = async () => {
    if (!canSend || sending) return;

    const attachments: PendingAttachment[] = doneAttachments.map(p => ({
      s3Key: p.s3Key,
      fileName: p.fileName,
      mime: p.mime,
      size: p.size,
    }));

    const content = input.trim();
    setSending(true);
    try {
      await onSend(content, attachments);
      pending.forEach(p => p.previewUrl && URL.revokeObjectURL(p.previewUrl));
      setInput('');
      setPending([]);
      setError(null);
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      if (code === 'TOO_MANY_REQUESTS') {
        setError(
          '메시지를 너무 빠르게 보내고 있어요. 잠시 후 다시 시도해주세요.',
        );
      } else {
        setError('메시지 전송에 실패했어요. 다시 시도해주세요.');
      }
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (e.nativeEvent.isComposing) return;
      handleSend();
    }
  };

  return (
    <div className="shrink-0 border-t border-border bg-surface px-3 py-3">
      {/* 첨부 미리보기 */}
      {pending.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {pending.map(item => (
            <div
              key={item.id}
              className="relative flex items-center gap-1.5 rounded-lg border border-border bg-white px-2 py-1.5"
            >
              {item.isImage && item.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.previewUrl}
                  alt={item.fileName}
                  className="h-9 w-9 rounded object-cover"
                />
              ) : (
                <span className="text-lg">📄</span>
              )}
              <span className="max-w-[90px] truncate text-[11px] text-slate-600">
                {item.fileName}
              </span>
              {item.status === 'uploading' && (
                <span className="text-[10px] text-slate-400">업로드중…</span>
              )}
              {item.status === 'error' && (
                <span className="text-[10px] text-red-400">실패</span>
              )}
              <button
                onClick={() => removePending(item.id)}
                className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 text-[10px] text-slate-600 hover:bg-slate-300"
                aria-label="첨부 삭제"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="mb-1.5 text-[11px] text-red-400">{error}</p>}

      <div className="flex items-center gap-2">
        {/* 숨겨진 파일 입력 */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ALLOWED_MIME.join(',')}
          className="hidden"
          onChange={e => {
            if (e.target.files) handleFiles(e.target.files);
            e.target.value = ''; // 같은 파일 재선택 허용
          }}
        />

        {/* 파일 첨부 버튼 (클립) */}
        <Button
          onClick={() => fileInputRef.current?.click()}
          isDisabled={pending.length >= MAX_ATTACHMENTS}
          className="h-9 w-9 min-w-0 rounded-xl border border-border bg-surface p-0 text-slate-500 disabled:opacity-40"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        </Button>

        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메시지를 전송하세요..."
          className="h-9 flex-1 rounded-xl border border-border bg-surface px-3.5 text-xs text-foreground placeholder:text-slate-400 focus:border-accent"
          fullWidth
        />
        <Button
          onClick={handleSend}
          isDisabled={!canSend}
          variant="primary"
          className="h-9 w-9 min-w-0 rounded-xl bg-accent p-0 text-accent-foreground disabled:opacity-40"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </Button>
      </div>
    </div>
  );
}
