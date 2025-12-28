import React, { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface ViewHeaderProps {
    icon: LucideIcon;
    title: string;
    subtitle?: string;
    children?: ReactNode;
}

export const ViewHeader: React.FC<ViewHeaderProps> = ({ icon: Icon, title, subtitle, children }) => {
    return (
        <div className="p-4 border-b flex justify-between items-center" style={{ backgroundColor: 'var(--elevated)', borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-3">
                <div className="p-2 rounded" style={{ backgroundColor: 'rgba(var(--accent-rgb), 0.2)' }}>
                    <Icon style={{ color: 'var(--accent)' }} size={20} />
                </div>
                <div>
                    <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
                    {subtitle && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>}
                </div>
            </div>

            {children && (
                <div className="flex items-center gap-4">
                    {children}
                </div>
            )}
        </div>
    );
};
