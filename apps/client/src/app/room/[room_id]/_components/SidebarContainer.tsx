'use client';

import { Button } from '@heroui/react';
import type { ReactNode } from 'react';

import { useSpaceStore } from '@/store/useSpaceStore';

interface SidebarContainerProps {
  children: ReactNode;
}

export default function SidebarContainer({ children }: SidebarContainerProps) {
  const isSidebarOpen = useSpaceStore(state => state.isSidebarOpen);
  const toggleSidebar = useSpaceStore(state => state.toggleSidebar);

  return (
    <div
      className={`sidebar-layout-container ${
        isSidebarOpen
          ? 'sidebar-layout-container-open'
          : 'sidebar-layout-container-closed'
      }`}
    >
      <aside
        aria-hidden={!isSidebarOpen}
        className="sidebar-container room-sidebar-content"
      >
        {children}
      </aside>
      <Button
        aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        className="room-sidebar-toggle-button"
        isIconOnly
        onPress={toggleSidebar}
        variant="ghost"
      >
        <span
          aria-hidden
          className={`room-sidebar-toggle-icon ${
            isSidebarOpen
              ? 'room-sidebar-toggle-icon-left'
              : 'room-sidebar-toggle-icon-right'
          }`}
        />
      </Button>
    </div>
  );
}
