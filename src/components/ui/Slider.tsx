import React from 'react';

interface SliderProps {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    className?: string;
}

export const Slider: React.FC<SliderProps> = ({
    value,
    onChange,
    min = 0,
    max = 100,
    step = 1,
    className = ''
}) => {
    const percentage = ((value - min) / (max - min)) * 100;

    return (
        <div className={`relative ${className}`}>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="absolute inset-0 z-10 h-1 rounded-lg appearance-none cursor-pointer"
                style={{
                    backgroundColor: 'transparent',
                }}
            />
            <div className="absolute inset-0 h-1 rounded-lg pointer-events-none" style={{ backgroundColor: 'var(--text-tertiary)', opacity: 0.3 }} />
            <div className="absolute bottom-0 left-0 h-1 rounded-lg pointer-events-none" style={{ backgroundColor: 'var(--primary)', width: `${percentage}%` }} />
        </div>
    );
};

// Styles CSS globaux pour le thumb rectangulaire
const sliderStyles = `
<style>
input[type="range"]::-webkit-slider-thumb {
    appearance: none;
    width: 15px;
    height: 10px;
    border-radius: 2px;
    background: var(--text-primary);
    cursor: pointer;
    border: 1px solid var(--border);
    box-shadow: 0 1px 3px rgba(0,0,0,0.4);
}

input[type="range"]::-moz-range-thumb {
    width: 12px;
    height: 20px;
    border-radius: 2px;
    background: var(--text-primary);
    cursor: pointer;
    border: 1px solid var(--border);
    box-shadow: 0 1px 3px rgba(0,0,0,0.4);
}
</style>
`;

if (typeof document !== 'undefined' && !document.getElementById('slider-styles')) {
    const styleElement = document.createElement('style');
    styleElement.id = 'slider-styles';
    styleElement.innerHTML = `
        input[type="range"]::-webkit-slider-thumb {
            appearance: none;
            width: 32px;
            height: 8px;
            border-radius: 2px;
            background: var(--elevated);
            cursor: pointer;
            border: 1px solid var(--border);
            box-shadow: 0 2px 4px rgba(0,0,0,0.5);
        }
        
        input[type="range"]::-moz-range-thumb {
            width: 32px;
            height: 8px;
            border-radius: 2px;
            background: var(--elevated);
            cursor: pointer;
            border: 1px solid var(--border);
            box-shadow: 0 2px 4px rgba(0,0,0,0.5);
        }
    `;
    document.head.appendChild(styleElement);
}
