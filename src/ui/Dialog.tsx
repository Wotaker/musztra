import { useEffect, useRef, type ReactNode } from 'react';
import { closeDialog } from './dialogs';
import { useViewStore, type Dialog as DialogId } from './store';

interface DialogProps {
  readonly id: DialogId;
  readonly title: string;
  readonly className?: string;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
}

/** Okno modalne nad placem: Esc lub klik w tło zamyka, fokus wraca do wiersza poleceń. */
export function Dialog({ id, title, className, children, footer }: DialogProps) {
  const open = useViewStore((s) => s.dialog === id);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>('[data-autofocus]') ?? panel;
    first?.focus();
  }, [open]);

  if (!open) return null;
  return (
    <div
      className="dialog-backdrop"
      data-testid={`${id}-backdrop`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeDialog();
      }}
    >
      <div
        ref={panelRef}
        className={`dialog${className ? ` ${className}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        data-testid={`${id}-dialog`}
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            closeDialog();
          }
        }}
      >
        <header className="dialog__header">
          <h2 id={`${id}-title`} className="dialog__title">
            {title}
          </h2>
          <button type="button" className="dialog__close" aria-label="Zamknij" data-testid={`${id}-close`} onClick={closeDialog}>
            ×
          </button>
        </header>
        <div className="dialog__body">{children}</div>
        {footer && <footer className="dialog__footer">{footer}</footer>}
      </div>
    </div>
  );
}
