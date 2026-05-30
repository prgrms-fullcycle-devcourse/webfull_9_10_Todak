import Image from 'next/image';

const CHARACTER_AVATARS: Record<string, { name: string; src: string }> = {
  bear: { name: '곰', src: '/assets/bear_front.png' },
  cat: { name: '고양이', src: '/assets/cat_front.png' },
  dog: { name: '강아지', src: '/assets/dog_front.png' },
  hamster: { name: '햄스터', src: '/assets/hamster_front.png' },
  rabbit: { name: '토끼', src: '/assets/rabbit_front.png' },
};

const ROLE_LABELS: Record<string, string> = {
  frontend: 'Frontend',
  backend: 'Backend',
  design: 'Designer',
  pm: 'PM',
};

interface Props {
  characterType: string | null;
  name: string;
  roles: string[];
  repoName: string | null;
}

export default function MyInformation({
  characterType,
  name,
  roles,
  repoName,
}: Props) {
  const characterAvatar =
    characterType === null ? undefined : CHARACTER_AVATARS[characterType];
  const avatarInitial = name.trim().slice(0, 1) || '?';
  const roleLabel = roles.map(role => ROLE_LABELS[role] ?? role).join(', ');
  const repoLabel =
    repoName === null ? 'repo: 연결된 저장소 없음' : `repo: ${repoName}`;

  return (
    <div className="mb-6 rounded-2xl border border-border bg-surface p-4 shadow-surface">
      <div className="flex items-center gap-3">
        {characterAvatar ? (
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-surface-secondary">
            <Image
              alt={`${characterAvatar.name} 캐릭터`}
              className="h-[78%] w-[78%] object-contain"
              height={550}
              src={characterAvatar.src}
              width={420}
            />
          </div>
        ) : (
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-lg font-black text-muted">
            {avatarInitial}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-foreground">
            {name}
            <span className="ml-1 font-todak-mono text-[9px] text-accent">
              [{roleLabel || 'Role'}]
            </span>
          </p>
          <p className="truncate font-todak-mono text-[9px] text-muted">
            {repoLabel}
          </p>
        </div>
      </div>
    </div>
  );
}
