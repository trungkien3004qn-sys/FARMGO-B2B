import type { ReactNode } from 'react';
import { AppIcon } from './AppIcon';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon = 'package', title, description, action }: EmptyStateProps) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
      <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
        {typeof icon === 'string' ? (
          <AppIcon name={icon} size={44} className="empty-state-icon" />
        ) : (
          icon
        )}
      </div>
      <h3 style={{ margin: '0 0 8px 0', color: '#334155', fontSize: '1.1rem' }}>{title}</h3>
      {description && <p style={{ margin: '0 0 16px 0', fontSize: '0.9rem' }}>{description}</p>}
      {action && (
        <button type="button" className="btn-primary" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}
