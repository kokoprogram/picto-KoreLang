import React from 'react';

interface MonoToggleProps {
    active: boolean;
    onClick: () => void;
    icon?: React.ReactNode;
    label?: string;
    title?: string;
    className?: string;
}

// Single-state toggle styled for mode switches (e.g., Script Mode)
export const MonoToggle: React.FC<MonoToggleProps> = ({ active, onClick, icon, label, title, className = '' }) => {
    const baseBg = 'var(--surface)';
    const activeBg = 'color-mix(in srgb, var(--indicator) 25%, transparent)';
    const activeBorder = 'color-mix(in srgb, var(--indicator) 60%, var(--border))';
    const inactiveBorder = 'var(--border)';

    return (
        <button
            onClick={onClick}
            title={title}
            className={`flex items-center gap-2 px-3 py-1 rounded-md text-xs font-bold transition-all border shadow-sm ${className}`}
            style={{
                backgroundColor: active ? activeBg : baseBg,
                color: active ? 'var(--indicator)' : 'var(--text-secondary)',
                borderColor: active ? activeBorder : inactiveBorder,
                boxShadow: active ? '0 0 10px rgba(168, 85, 247, 0.25)' : 'none'
            }}
        >
            {icon}
            {label && <span className="hidden sm:inline">{label}</span>}
        </button>
    );
};
