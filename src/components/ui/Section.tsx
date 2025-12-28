import React, { ReactNode } from 'react';

interface SectionProps {
  title: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
  className?: string;
  icon?: ReactNode;
}

/**
 * Composant Section pour les sections avec titre et contenu
 * - Utilise des couleurs CSS variables
 * - Hiérarchie de texte cohérente
 */
export const Section: React.FC<SectionProps> = ({ 
  title,
  subtitle,
  children,
  className = '',
  icon
}) => {
  return (
    <div className={className}>
      <div className="flex items-start gap-2 mb-4">
        {icon && <div className="pt-0.5" style={{ color: 'var(--accent)' }}>{icon}</div>}
        <div>
          <h3 
            className="text-sm font-bold tracking-wider uppercase"
            style={{ color: 'var(--text-primary)' }}
          >
            {title}
          </h3>
          {subtitle && (
            <p 
              className="mt-1 text-xs"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
};
