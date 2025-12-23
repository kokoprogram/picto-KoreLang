import React from 'react';
import { ScriptConfig } from '../types';

interface ConScriptRendererProps {
    text: string;
    scriptConfig?: ScriptConfig;
    className?: string;
    scale?: number;
}

export const ConScriptText: React.FC<ConScriptRendererProps> = ({ text, scriptConfig, className, scale = 1 }) => {
    if (!scriptConfig) return <span className={className}>{text}</span>;

    const lines = text.split('\n');
    const CANVAS_SIZE = 400;
    const isProportional = scriptConfig.spacingMode === 'proportional';

    const dir = scriptConfig.direction || 'ltr';
    const isVertical = dir === 'ttb';

    // Page Flow: How lines stack relative to each other
    // TTB: Lines are columns stacking to the Right (row) inside the LTR container
    // LTR/RTL: Lines are rows stacking Down (column)
    const pageFlow = isVertical ? 'row' : 'column';

    // Line Flow: How characters stack within a line
    // TTB: Chars go Down (column)
    // LTR/RTL: We use native 'row'. 
    // If direction is 'rtl', 'row' naturally flows Right-to-Left. 
    // If direction is 'ltr', 'row' naturally flows Left-to-Right.
    const lineFlow = isVertical ? 'column' : 'row';

    // Alignment for lines in the page
    // In standard Block layout (column), flex-start aligns to the "Start" edge.
    // In RTL, "Start" is Right. In LTR, "Start" is Left.
    // So 'flex-start' handles both correctly if the container has the correct 'direction'.
    const pageAlign = 'flex-start';

    return (
        <span
            className={`inline-flex gap-4 ${className}`}
            style={{
                direction: dir === 'ttb' ? 'ltr' : dir, // Force LTR for TTB structure, use native for others
                flexDirection: pageFlow,
                alignItems: pageAlign,
                lineHeight: 1,
                verticalAlign: isVertical ? 'top' : undefined,
                width: isVertical ? 'max-content' : undefined,
                height: isVertical ? '100%' : undefined
            }}
            title={text}
        >
            {lines.map((line, lineIdx) => {
                const chars = line.split('');
                return (
                    <span
                        key={lineIdx}
                        className="inline-flex gap-[0.05em]"
                        style={{
                            flexDirection: lineFlow,
                            alignItems: isVertical ? 'center' : 'baseline',
                            flexWrap: 'wrap',
                            height: isVertical ? '100%' : undefined,
                            maxHeight: isVertical ? '100%' : undefined
                        }}
                    >
                        {chars.map((char, charIdx) => {
                            const glyph = scriptConfig.glyphs.find(g => g.char === char || g.pua === char);

                            if (char === ' ') return <span key={charIdx} className="inline-block w-[0.25em] h-[1em]"></span>;

                            if (glyph) {
                                // Cálculo de ancho dinámico para espaciado proporcional
                                const glyphWidth = isProportional && glyph.viewWidth
                                    ? (glyph.viewWidth / CANVAS_SIZE)
                                    : 0.75; // Por defecto o mono

                                return (
                                    <svg
                                        key={charIdx}
                                        viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}
                                        className="inline-block overflow-visible"
                                        style={{
                                            height: '0.75em',
                                            width: `${glyphWidth}em`,
                                            fill: 'none',
                                            verticalAlign: '-0.12em'
                                        }}
                                        preserveAspectRatio="xMinYMid meet"
                                        aria-hidden="true"
                                    >
                                        {glyph.strokes?.map((s, si) => (
                                            s.visible && (
                                                s.type === 'image' ? (
                                                    <image
                                                        key={si}
                                                        href={s.imageUrl}
                                                        x={s.x}
                                                        y={s.y}
                                                        width={s.width}
                                                        height={s.height}
                                                        opacity={s.opacity || 1}
                                                    />
                                                ) : (
                                                    <path
                                                        key={si}
                                                        d={s.d}
                                                        stroke={s.color || 'currentColor'}
                                                        strokeWidth={`${s.strokeWidth || 15}px`}
                                                        strokeLinecap={s.cap || 'round'}
                                                        strokeLinejoin="round"
                                                    />
                                                )
                                            )
                                        ))}
                                        {glyph.imageUrl && !glyph.strokes?.some(s => s.type === 'image') && (
                                            <image href={glyph.imageUrl} x="0" y="0" width={CANVAS_SIZE} height={CANVAS_SIZE} preserveAspectRatio="xMidYMid meet" opacity="0.8" />
                                        )}
                                    </svg>
                                );
                            }

                            // Fallback de "NotDef"
                            return (
                                <svg
                                    key={charIdx}
                                    viewBox="0 0 100 100"
                                    className="inline-block opacity-20"
                                    style={{ height: '0.7em', width: '0.5em', verticalAlign: '-0.1em' }}
                                >
                                    <rect x="10" y="10" width="80" height="80" stroke="currentColor" strokeWidth="10" fill="none" />
                                    <line x1="10" y1="10" x2="90" y2="90" stroke="currentColor" strokeWidth="5" />
                                    <line x1="90" y1="10" x2="10" y2="90" stroke="currentColor" strokeWidth="5" />
                                </svg>
                            );
                        })}
                        {/* Render empty placeholder if line is empty to maintain structure */}
                        {chars.length === 0 && <span className="inline-block w-[0.25em] h-[1em]"></span>}
                    </span>
                );
            })}
        </span>
    );
};
