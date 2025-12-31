import React, { useState } from 'react';
import { BookOpen, Eraser, Copy, Type } from 'lucide-react';
import { ConScriptText } from './ConScriptRenderer';
import { ScriptConfig } from '../types';
import { useTranslation } from '../i18n';
import { ViewLayout, CompactButton, StatBadge, Slider } from './ui';

interface NotebookProps {
    scriptConfig?: ScriptConfig;
    isScriptMode?: boolean;
    text: string;
    setText: (text: string) => void;
}

const Notebook: React.FC<NotebookProps> = ({ scriptConfig, isScriptMode, text, setText }) => {
    const { t } = useTranslation();

    // Determinamos la dirección basándonos estrictamente en si es RTL.
    // El modo TTB (Vertical) no debe forzar la inversión de caracteres LTR.
    const direction = (scriptConfig?.direction === 'rtl') ? 'rtl' : 'ltr';

    const [fontSize, setFontSize] = useState<number>(() => {
        const saved = localStorage.getItem('korelang_notebook_font_size');
        return saved ? parseInt(saved) : 24;
    });

    React.useEffect(() => {
        localStorage.setItem('korelang_notebook_font_size', fontSize.toString());
    }, [fontSize]);

    React.useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'korelang_notebook_font_size' && e.newValue) {
                setFontSize(parseInt(e.newValue));
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const renderContainerRef = React.useRef<HTMLDivElement>(null);

    return (
        <ViewLayout
            icon={BookOpen}
            title={t('notebook.title')}
            subtitle={t('notebook.subtitle')}
            headerChildren={
                <div className="flex items-center gap-2 px-3 py-1.5 rounded" style={{ backgroundColor: 'var(--surface)' }}>
                    <Type size={14} style={{ color: 'var(--text-secondary)' }} />
                    <Slider
                        value={fontSize}
                        onChange={setFontSize}
                        min={12}
                        max={128}
                        className="w-24 h-1"
                    />
                    <span className="text-[10px] font-mono w-8 text-center" style={{ color: 'var(--text-secondary)' }}>{fontSize}px</span>
                </div>
            }
        >

            {/* Split View */}
            <div className="flex h-full w-full overflow-hidden gap-4 p-4">
                {/* Input Area */}
                <div className="flex-1 flex flex-col overflow-hidden rounded border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                    <div className="flex justify-between items-center px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>{t('notebook.input')}</h3>
                        <div className="flex items-center gap-1">
                            <CompactButton
                                onClick={() => setText('')}
                                variant="ghost"
                                icon={<Eraser size={14} />}
                                label=""
                                title={t('notebook.clear')}
                            />
                            <CompactButton
                                onClick={() => navigator.clipboard.writeText(text)}
                                variant="ghost"
                                icon={<Copy size={14} />}
                                label=""
                                title={t('notebook.copy')}
                            />
                            <StatBadge value={text.length} label="chars" />
                        </div>
                    </div>
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        className="flex-1 bg-transparent p-4 font-mono text-base leading-relaxed focus:outline-none resize-none overflow-y-auto"
                        spellCheck={false}
                        dir={direction}
                        key={`input-${direction}`}
                        style={{
                            color: 'var(--text-secondary)',
                            caretColor: 'var(--accent)',
                            textAlign: direction === 'rtl' ? 'right' : 'left'
                        }}
                    />
                </div>

                {/* Render Area */}
                {(() => {
                    const dir = scriptConfig?.direction || 'ltr';
                    const isVertical = dir === 'ttb' || dir === 'ttb-ltr';
                    const isVerticalLTR = dir === 'ttb-ltr';
                    const isVerticalRTL = dir === 'ttb';
                    // We treat 'ttb' (Traditional Vertical) as RTL context because it starts from Right
                    const isRTLContext = dir === 'rtl' || dir === 'ttb';

                    const scrollContainerRef = React.useRef<HTMLDivElement>(null);
                    // Sticky state: true if we should auto-scroll to end. Defaults to true.
                    const isStickyRef = React.useRef<boolean>(true);

                    // Handle user scroll to update sticky state
                    const handleScroll = () => {
                        const container = scrollContainerRef.current;
                        if (!container) return;

                        const threshold = 50; // pixels from edge to be considered "sticky"

                        if (isVerticalLTR) {
                            // V-LTR: "End" is Right (scrollWidth).
                            // scrollLeft goes from 0 to (scrollWidth - clientWidth)
                            const maxScroll = container.scrollWidth - container.clientWidth;
                            isStickyRef.current = Math.abs(container.scrollLeft - maxScroll) < threshold;
                        } else if (isVerticalRTL) {
                            // V-RTL (Chrome/Modern): "End" is Left.
                            // Container has dir="rtl" or row-reverse logic maybe?
                            // Standard RTL browser: Right is 0 or initial. Left is negative.
                            // If we use negative scrollLeft:
                            const current = container.scrollLeft;
                            // We check if we are close to the leftmost edge (which is negative max)
                            // Actually, simpler check: |scrollLeft| > max - threshold
                            const maxScroll = container.scrollWidth - container.clientWidth;
                            // In most RTL implementations, scrollLeft is negative or positive depending on implementation.
                            // But "End" of content (Left side) is when we have scrolled fully away from 0.
                            isStickyRef.current = Math.abs(Math.abs(current) - maxScroll) < threshold;
                        } else {
                            // Horizontal: "End" is Bottom.
                            const maxScroll = container.scrollHeight - container.clientHeight;
                            isStickyRef.current = Math.abs(container.scrollTop - maxScroll) < threshold;
                        }
                    };

                    React.useLayoutEffect(() => {
                        const container = scrollContainerRef.current;
                        if (!container) return;

                        // Only auto-scroll if we are "sticky"
                        if (isStickyRef.current) {
                            if (isVerticalLTR) {
                                container.scrollLeft = container.scrollWidth;
                            } else if (isVerticalRTL) {
                                // V-RTL
                                container.scrollLeft = -container.scrollWidth;
                            } else {
                                container.scrollTop = container.scrollHeight;
                            }
                        }
                    }, [text, scriptConfig?.direction]); // Depend on text change to trigger auto-scroll


                    return (
                        <div
                            // Usamos una clave para forzar el re-renderizado cuando cambia la dirección
                            key={`render-area-${dir}`}
                            className={`flex-1 flex flex-col overflow-hidden rounded border custom-scrollbar ${isVertical ? 'overflow-x-auto' : ''}`}
                            style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
                            dir={isRTLContext ? 'rtl' : 'ltr'}
                        >
                            <div className="flex justify-between items-center px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>{t('notebook.live_renderer')}</h3>
                            </div>
                            <div
                                ref={scrollContainerRef}
                                onScroll={handleScroll}
                                className={`flex-1 p-4 ${isVertical ? 'overflow-x-auto overflow-y-hidden' : 'overflow-y-auto'}`}
                            >
                                {isScriptMode && scriptConfig ? (
                                    <div
                                        className="leading-loose break-words whitespace-pre-wrap transition-all duration-200"
                                        style={{
                                            fontSize: `${fontSize}px`,
                                            color: 'var(--text-primary)',
                                            height: isVertical ? '100%' : 'auto',
                                        }}
                                    >
                                        <ConScriptText text={text} scriptConfig={scriptConfig} wordWrap={true} />
                                    </div>
                                ) : (
                                    <div className="text-2xl leading-loose break-words whitespace-pre-wrap font-serif italic opacity-30 text-center" style={{ color: 'var(--text-secondary)' }}>
                                        {text ? t('notebook.switch_prompt') : t('notebook.empty_sandbox')}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })()}
            </div>
        </ViewLayout >
    );
};

export default Notebook;