import React, { useMemo } from 'react';
import { ScriptConfig, ScriptGlyph, GlyphStroke } from '../types';

interface ConScriptRendererProps {
    text: string;
    scriptConfig?: ScriptConfig;
    className?: string;
    scale?: number;
    wordWrap?: boolean;
}

const CANVAS_SIZE = 400;

interface ConScriptCharProps {
    char: string;
    glyph?: ScriptGlyph;
    isVertical: boolean;
    isProportional: boolean;
}

const ConScriptChar: React.FC<ConScriptCharProps> = React.memo(({ char, glyph, isVertical, isProportional }) => {
    // Check for glyph first (allows custom space glyphs)
    if (glyph) {
        // Dynamic width calculation
        const glyphWidth = isProportional && glyph.viewWidth
            ? (glyph.viewWidth / CANVAS_SIZE)
            : 0.75;

        // In Vertical Upright, we typically want the character to sit in a standard 1em box
        // independent of its horizontal width. Swapping width/height (previous logic)
        // caused narrow characters to become short/squashed vertically.

        const style: React.CSSProperties = isVertical ? {
            width: '1em',      // Standard column width
            height: '1em',     // Standard vertical rhythm
        } : {
            width: `${glyphWidth}em`,
            height: '0.75em',  // Standard line height visual
        };

        return (
            <svg
                viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}
                style={{
                    display: 'inline-block', // Behaves like text character
                    verticalAlign: 'middle',
                    overflow: 'visible',
                    fill: 'none',
                    ...style
                }}
                preserveAspectRatio="xMidYMid meet"
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

    if (char === ' ') {
        return <span style={{
            display: 'inline-block',
            width: isVertical ? '1em' : '0.25em',
            height: isVertical ? '0.25em' : '1em',
        }}></span>;
    }

    // Fallback "NotDef"
    return (
        <svg
            viewBox="0 0 100 100"
            style={{
                display: 'inline-block',
                verticalAlign: 'middle',
                opacity: 0.2,
                width: '0.5em',
                height: '0.7em',
            }}
        >
            <rect x="10" y="10" width="80" height="80" stroke="currentColor" strokeWidth="10" fill="none" />
            <line x1="10" y1="10" x2="90" y2="90" stroke="currentColor" strokeWidth="5" />
            <line x1="90" y1="10" x2="10" y2="90" stroke="currentColor" strokeWidth="5" />
        </svg>
    );
});

export const ConScriptText: React.FC<ConScriptRendererProps> = ({ text, scriptConfig, className, scale = 1, wordWrap = false }) => {
    if (!scriptConfig) return <span className={className}>{text}</span>;

    // Create a Map for O(1) lookup
    const glyphMap = useMemo(() => {
        const map = new Map<string, ScriptGlyph>();
        scriptConfig.glyphs.forEach(g => {
            if (g.char) map.set(g.char, g);
            if (g.pua) map.set(g.pua, g);
        });
        return map;
    }, [scriptConfig.glyphs]);

    const lines = text.split('\n');
    const isProportional = scriptConfig.spacingMode === 'proportional';

    const dir = scriptConfig.direction || 'ltr';
    const isVerticalLTR = dir === 'ttb-ltr';
    const isVerticalRTL = dir === 'ttb';
    const isVertical = isVerticalLTR || isVerticalRTL;
    const isRTL = dir === 'rtl';

    // Flexbox Layout Strategy
    // Top-level container orientation (Flow of LINES)
    // Horizontal (LTR/RTL): Lines flow Top-to-Bottom (Column)
    // Vertical (V-RTL): Lines flow Right-to-Left (Row-Reverse)
    // Vertical (V-LTR): Lines flow Left-to-Right (Row)
    const outerFlexDir = isVertical ? (isVerticalLTR ? 'row' : 'row-reverse') : 'column';

    // Line content orientation (Flow of CHARACTERS)
    // LTR: Left-to-Right (Row)
    // RTL: Right-to-Left (Row-Reverse)
    // TTB: Top-to-Bottom (Column)
    // Line content orientation (Flow of CHARACTERS)
    // LTR: Left-to-Right (Row)
    // Alignment within the line
    // For Native RTL (direction: rtl), flex-start is Right.
    // For Native LTR (direction: ltr), flex-start is Left.
    const justifyContent = 'flex-start';

    return (
        <div
            className={className}
            style={{
                display: 'flex',

                // Outer Layout (Line Stacking)
                flexDirection: outerFlexDir,

                flexWrap: isVertical ? 'nowrap' : 'nowrap',
                gap: '0.2em',

                // Container sizing
                width: isVertical ? 'fit-content' : '100%',
                height: isVertical ? '100%' : 'auto',
                minHeight: 'min-content',

                // Scaling support
                fontSize: scale !== 1 ? `${scale}em` : undefined,

                // Allow scrolling
                overflow: 'visible',

                // CORE FIX: Use NATIVE direction for Horizontal modes.
                // For Vertical, we keep the base direction unless specified otherwise.
                direction: isRTL ? 'rtl' : 'ltr',

                writingMode: 'horizontal-tb',
                textAlign: isRTL ? 'right' : 'left'
            }}
            title={text}
            data-direction={dir}
        >
            {lines.map((line, lineIdx) => {
                const chars = line.split('');
                return (
                    <div
                        key={lineIdx}
                        style={{
                            display: 'flex',

                            // Inner Layout (Character Flow)
                            // LTR: Row (L->R)
                            // RTL: Row (L->R) BUT affected by parent direction: rtl -> Visual (R->L)
                            // Vertical: Column (T->B)
                            flexDirection: isVertical ? 'column' : 'row',

                            flexWrap: wordWrap ? 'wrap' : 'nowrap',
                            justifyContent: justifyContent,
                            alignItems: 'center',
                            gap: isProportional ? '0.1em' : '0',

                            // Line Dimensions
                            minHeight: isVertical ? undefined : '1em',
                            minWidth: isVertical ? '1em' : undefined,

                            // Ensure full width in horizontal mode
                            width: isVertical ? 'auto' : '100%',

                            // Force clean context
                            // For Vertical RTL: We want wrapping (if any) to flow to the LEFT (next column left).
                            // For Vertical LTR: We want wrapping to flow to the RIGHT (next column right).
                            direction: isVerticalRTL ? 'rtl' : 'inherit'
                        }}
                    >
                        {chars.map((char, charIdx) => (
                            <ConScriptChar
                                key={charIdx}
                                char={char}
                                glyph={glyphMap.get(char)}
                                isVertical={isVertical}
                                isProportional={isProportional}
                            />
                        ))}
                        {/* Empty line height preservation */}
                        {chars.length === 0 && <span style={{ display: 'inline-block', width: '1px', height: '1em' }}>&nbsp;</span>}
                    </div>
                );
            })}
        </div>
    );
};

