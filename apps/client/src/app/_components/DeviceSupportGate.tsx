'use client';

import { useSyncExternalStore, type ReactNode } from 'react';

import { isMobileOrTabletUserAgent } from '@/lib/device';

import { UnsupportedDeviceScreen } from './UnsupportedDeviceScreen';

export function DeviceSupportGate({ children }: { children: ReactNode }) {
  const isUnsupportedDevice = useSyncExternalStore(
    subscribeToDeviceInfo,
    isMobileOrTabletDevice,
    getServerDeviceSupportSnapshot,
  );

  if (isUnsupportedDevice) {
    return <UnsupportedDeviceScreen />;
  }

  return <div className="todak-desktop-content">{children}</div>;
}

function subscribeToDeviceInfo() {
  return () => {};
}

function getServerDeviceSupportSnapshot() {
  return false;
}

function isMobileOrTabletDevice() {
  const userAgent = window.navigator.userAgent;
  const platform = window.navigator.platform;
  const maxTouchPoints = window.navigator.maxTouchPoints;
  const isIpadDesktopMode = platform === 'MacIntel' && maxTouchPoints > 1;

  return isMobileOrTabletUserAgent(userAgent) || isIpadDesktopMode;
}
