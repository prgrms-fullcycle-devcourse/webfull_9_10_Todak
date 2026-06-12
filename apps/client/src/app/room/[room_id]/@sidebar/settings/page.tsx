import Link from 'next/link';

import SettingsSidebarBackButton from './_components/SettingsSidebarBackButton';

export default function SettingsSidebar() {
  return (
    <nav aria-label="설정 메뉴" className="flex h-full min-h-0 flex-col">
      <div className="shrink-0">
        <p className="todak-section-label text-todak-coral-500">SETTINGS</p>
        <h2 className="mt-2 text-lg font-black text-foreground">룸 설정</h2>
        <p className="mt-2 text-[11px] font-bold leading-5 text-muted">
          메뉴를 누르면 설정 페이지의 해당 영역으로 이동합니다.
        </p>
      </div>

      <div className="mt-5 space-y-2">
        <Link
          className="block rounded-xl border border-border bg-surface px-3.5 py-3 text-xs font-black text-foreground shadow-sm transition-colors hover:bg-surface-secondary"
          href="#profile"
        >
          프로필
        </Link>
        <Link
          className="block rounded-xl border border-border bg-surface px-3.5 py-3 text-xs font-black text-foreground shadow-sm transition-colors hover:bg-surface-secondary"
          href="#project"
        >
          프로젝트 설정
        </Link>
      </div>

      <div className="mt-auto pt-5">
        <SettingsSidebarBackButton />
      </div>
    </nav>
  );
}
