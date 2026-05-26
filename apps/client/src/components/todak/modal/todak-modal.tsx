'use client';

import { Modal as HeroModal } from '@heroui/react';
import type {
  ModalBackdropProps,
  ModalBodyProps,
  ModalCloseTriggerProps,
  ModalContainerProps,
  ModalDialogProps,
  ModalFooterProps,
  ModalHeaderProps,
  ModalHeadingProps,
  ModalIconProps,
  ModalRootProps,
  ModalTriggerProps,
} from '@heroui/react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

export type TodakModalClassNames = Partial<{
  backdrop: string;
  body: string;
  closeTrigger: string;
  container: string;
  dialog: string;
  footer: string;
  header: string;
  heading: string;
  icon: string;
  trigger: string;
}>;

export type TodakModalRootProps = ModalRootProps;
export type TodakModalTriggerProps = ModalTriggerProps;
export type TodakModalBackdropProps = ModalBackdropProps;
export type TodakModalContainerProps = ModalContainerProps;
export type TodakModalDialogProps = ModalDialogProps;
export type TodakModalHeaderProps = ModalHeaderProps;
export type TodakModalIconProps = ModalIconProps;
export type TodakModalHeadingProps = ModalHeadingProps;
export type TodakModalBodyProps = ModalBodyProps;
export type TodakModalFooterProps = ModalFooterProps;
export type TodakModalCloseTriggerProps = ModalCloseTriggerProps;

export type TodakModalProps = Omit<ModalRootProps, 'children'> & {
  backdrop?: ModalBackdropProps['variant'];
  backdropProps?: Omit<ModalBackdropProps, 'children'>;
  children?: ReactNode;
  classNames?: TodakModalClassNames;
  closeButton?: ReactNode;
  closeTriggerProps?: Omit<ModalCloseTriggerProps, 'children'>;
  containerProps?: Omit<ModalContainerProps, 'children'>;
  dialogProps?: Omit<ModalDialogProps, 'children'>;
  isDismissable?: ModalBackdropProps['isDismissable'];
  placement?: ModalContainerProps['placement'];
  scroll?: ModalContainerProps['scroll'];
  showCloseButton?: boolean;
  size?: ModalContainerProps['size'];
  trigger?: ReactNode;
  triggerProps?: ModalTriggerProps;
};

type ClassNameProp<T> = T extends { className?: infer TClassName }
  ? TClassName
  : string | undefined;

function composeClassName<TProps>(
  className: ClassNameProp<TProps> | undefined,
  ...baseClassNames: Parameters<typeof cn>
) {
  if (typeof className === 'function') {
    return ((renderProps: unknown) =>
      cn(...baseClassNames, className(renderProps))) as ClassNameProp<TProps>;
  }

  return cn(
    ...baseClassNames,
    className as string | undefined,
  ) as ClassNameProp<TProps>;
}

export function TodakModalRoot({ children, ...props }: TodakModalRootProps) {
  return <HeroModal {...props}>{children}</HeroModal>;
}

export function TodakModalTrigger({
  className,
  ...props
}: TodakModalTriggerProps) {
  return (
    <HeroModal.Trigger
      {...props}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-xs font-black text-accent-foreground shadow-md transition-all hover:bg-accent-hover focus:outline-none',
        className,
      )}
    />
  );
}

export function TodakModalBackdrop({
  className,
  variant = 'blur',
  ...props
}: TodakModalBackdropProps) {
  return (
    <HeroModal.Backdrop
      {...props}
      className={composeClassName<TodakModalBackdropProps>(
        className,
        'bg-backdrop backdrop-blur-xs',
      )}
      variant={variant}
    />
  );
}

export function TodakModalContainer({
  className,
  placement = 'center',
  scroll = 'inside',
  size = 'md',
  ...props
}: TodakModalContainerProps) {
  return (
    <HeroModal.Container
      {...props}
      className={composeClassName<TodakModalContainerProps>(className, 'p-4')}
      placement={placement}
      scroll={scroll}
      size={size}
    />
  );
}

export function TodakModalDialog({
  className,
  ...props
}: TodakModalDialogProps) {
  return (
    <HeroModal.Dialog
      {...props}
      className={composeClassName<TodakModalDialogProps>(
        className,
        'animate-todak-fade-in relative overflow-hidden rounded-2xl border border-border bg-overlay text-overlay-foreground shadow-overlay outline-none',
      )}
    />
  );
}

export function TodakModalHeader({
  className,
  ...props
}: TodakModalHeaderProps) {
  return (
    <HeroModal.Header
      {...props}
      className={cn(
        'flex items-start justify-between gap-3 border-b border-separator bg-surface-secondary px-5 py-4 pr-12',
        className,
      )}
    />
  );
}

export function TodakModalIcon({ className, ...props }: TodakModalIconProps) {
  return (
    <HeroModal.Icon
      {...props}
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-full border border-accent-soft bg-accent-soft text-accent-soft-foreground',
        className,
      )}
    />
  );
}

export function TodakModalHeading({
  className,
  ...props
}: TodakModalHeadingProps) {
  return (
    <HeroModal.Heading
      {...props}
      className={cn('text-sm font-black text-foreground', className)}
    />
  );
}

export function TodakModalBody({ className, ...props }: TodakModalBodyProps) {
  return (
    <HeroModal.Body
      {...props}
      className={cn(
        'space-y-4 px-5 py-5 text-xs leading-relaxed text-muted',
        className,
      )}
    />
  );
}

export function TodakModalFooter({
  className,
  ...props
}: TodakModalFooterProps) {
  return (
    <HeroModal.Footer
      {...props}
      className={cn(
        'flex items-center justify-end gap-2 border-t border-separator bg-surface-secondary px-5 py-4',
        className,
      )}
    />
  );
}

export function TodakModalCloseTrigger({
  children = '×',
  className,
  ...props
}: TodakModalCloseTriggerProps) {
  return (
    <HeroModal.CloseTrigger
      {...props}
      className={composeClassName<TodakModalCloseTriggerProps>(
        className,
        'absolute right-4 top-4 z-10 flex size-7 items-center justify-center rounded-full text-sm font-bold text-muted transition-colors hover:bg-default hover:text-foreground focus:outline-none',
      )}
    >
      {children}
    </HeroModal.CloseTrigger>
  );
}

function TodakModalBase({
  backdrop = 'blur',
  backdropProps,
  children,
  classNames,
  closeButton,
  closeTriggerProps,
  containerProps,
  dialogProps,
  isDismissable = true,
  placement = 'center',
  scroll = 'inside',
  showCloseButton = true,
  size = 'md',
  trigger,
  triggerProps,
  ...rootProps
}: TodakModalProps) {
  const { className: triggerClassName, ...restTriggerProps } =
    triggerProps ?? {};
  const {
    className: backdropClassName,
    isDismissable: backdropIsDismissable,
    variant: backdropVariant,
    ...restBackdropProps
  } = backdropProps ?? {};
  const {
    className: containerClassName,
    placement: containerPlacement,
    scroll: containerScroll,
    size: containerSize,
    ...restContainerProps
  } = containerProps ?? {};
  const { className: dialogClassName, ...restDialogProps } = dialogProps ?? {};
  const { className: closeTriggerClassName, ...restCloseTriggerProps } =
    closeTriggerProps ?? {};

  return (
    <TodakModalRoot {...rootProps}>
      {trigger ? (
        <TodakModalTrigger
          {...restTriggerProps}
          className={cn(classNames?.trigger, triggerClassName)}
        >
          {trigger}
        </TodakModalTrigger>
      ) : null}

      <TodakModalBackdrop
        {...restBackdropProps}
        className={composeClassName<TodakModalBackdropProps>(
          backdropClassName,
          classNames?.backdrop,
        )}
        isDismissable={backdropIsDismissable ?? isDismissable}
        variant={backdropVariant ?? backdrop}
      >
        <TodakModalContainer
          {...restContainerProps}
          className={composeClassName<TodakModalContainerProps>(
            containerClassName,
            classNames?.container,
          )}
          placement={containerPlacement ?? placement}
          scroll={containerScroll ?? scroll}
          size={containerSize ?? size}
        >
          <TodakModalDialog
            {...restDialogProps}
            className={composeClassName<TodakModalDialogProps>(
              dialogClassName,
              classNames?.dialog,
            )}
          >
            {showCloseButton ? (
              <TodakModalCloseTrigger
                {...restCloseTriggerProps}
                className={composeClassName<TodakModalCloseTriggerProps>(
                  closeTriggerClassName,
                  classNames?.closeTrigger,
                )}
              >
                {closeButton}
              </TodakModalCloseTrigger>
            ) : null}
            {children}
          </TodakModalDialog>
        </TodakModalContainer>
      </TodakModalBackdrop>
    </TodakModalRoot>
  );
}

export const TodakModal = Object.assign(TodakModalBase, {
  Backdrop: TodakModalBackdrop,
  Body: TodakModalBody,
  CloseTrigger: TodakModalCloseTrigger,
  Container: TodakModalContainer,
  Dialog: TodakModalDialog,
  Footer: TodakModalFooter,
  Header: TodakModalHeader,
  Heading: TodakModalHeading,
  Icon: TodakModalIcon,
  Root: TodakModalRoot,
  Trigger: TodakModalTrigger,
});

export {
  TodakModalBody as TodakBody,
  TodakModalCloseTrigger as TodakCloseTrigger,
  TodakModalFooter as TodakFooter,
  TodakModalHeader as TodakHeader,
  TodakModalHeading as TodakHeading,
  TodakModalIcon as TodakIcon,
  TodakModalTrigger as TodakTrigger,
};
