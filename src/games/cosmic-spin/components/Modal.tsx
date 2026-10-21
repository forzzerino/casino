import { useEffect, useId, useRef, type ReactNode } from 'react';
import { useT } from '../i18n';
import { Icon } from './Icon';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface ModalProps {
  readonly title: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
  readonly size?: 'small' | 'medium' | 'large';
}

/**
 * Accessible dialog: focus moves in and is trapped, Esc closes, focus returns
 * to the element that opened it, and the game behind it is inert.
 */
export function Modal({ title, onClose, children, footer, size = 'medium' }: ModalProps) {
  const t = useT();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    const first = dialog?.querySelector<HTMLElement>('[data-autofocus]') ?? dialog?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialog) return;
      const items = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (items.length === 0) return;
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      previous?.focus();
    };
  }, []);

  return (
    <div className="cs-modal-backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={dialogRef} className={`cs-modal cs-modal--${size}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="cs-modal__header">
          <h2 id={titleId} className="cs-modal__title">
            {title}
          </h2>
          <button type="button" className="cs-icon-button cs-modal__close" onClick={onClose} aria-label={t('modal.close')}>
            <Icon name="close" />
          </button>
        </header>
        <div className="cs-modal__body">{children}</div>
        {footer && <footer className="cs-modal__footer">{footer}</footer>}
      </div>
    </div>
  );
}
