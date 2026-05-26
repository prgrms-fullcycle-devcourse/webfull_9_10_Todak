'use client';

import { useOverlayState } from '@heroui/react';
import type {
  UseOverlayStateProps,
  UseOverlayStateReturn,
} from '@heroui/react';

export type TodakModalStateOptions = UseOverlayStateProps;

export type TodakModalState = UseOverlayStateReturn & {
  onClose: UseOverlayStateReturn['close'];
  onOpen: UseOverlayStateReturn['open'];
  onOpenChange: UseOverlayStateReturn['setOpen'];
};

export function useTodakModal(
  options?: TodakModalStateOptions,
): TodakModalState {
  const state = useOverlayState(options);

  return {
    ...state,
    onClose: state.close,
    onOpen: state.open,
    onOpenChange: state.setOpen,
  };
}
