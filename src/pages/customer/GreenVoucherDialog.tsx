import { useEffect, useRef, type ReactNode } from 'react';
import { money } from '../../components/shared/useCatalog';
import './farmgo-green.css';

export function GreenDialog({ title, close, children }: { title: string; close: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return <dialog ref={ref} className="green-dialog" aria-label={title} onCancel={event => { event.preventDefault(); close(); }}>
    <header><h2>{title}</h2><button type="button" aria-label="Đóng" onClick={close}>×</button></header>
    <div className="green-dialog-body">{children}</div>
  </dialog>;
}

export function VoucherTile({ value, children, action }: { value: number; children: ReactNode; action: ReactNode }) {
  const premium = value === 100000;
  return <div className="green-ticket">
    <div className="green-ticket-art" data-premium={premium} aria-hidden="true">
      <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {premium ? <path d="M5 10l11-5 11 5v13l-11 5-11-5zM5 10l11 5 11-5M16 15v13M10 8l11 5" />
          : <path d="M3 8h16v14H3zM19 13h5l5 5v4H19M6 23a2 2 0 1 0 4 0 2 2 0 1 0-4 0m15 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0" />}
      </svg>
    </div>
    <div><strong>Giảm {money(value)} phí giao</strong><div>{children}</div></div>
    {action}
  </div>;
}
