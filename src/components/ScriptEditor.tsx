
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Feather, Save, Image as ImageIcon, Palette, Spline, RotateCw, RotateCcw, Square, Circle, Minus, Layers, Eye, EyeOff, Lock, Unlock, ChevronLeft, ChevronRight, Trash2, ChevronUp, ChevronDown, Plus, Edit3, Type, Grid, ZoomIn, ZoomOut, Map as MapIcon, Search, Eraser, Sun, ArrowRight, ArrowLeft, ArrowDown } from 'lucide-react';
import { ScriptConfig, ScriptGlyph, ProjectConstraints, GlyphStroke } from '../types';
import { useTranslation } from '../i18n';
import { ConScriptText } from './ConScriptRenderer';
import { Card, Section, ViewLayout, CompactButton, ToggleButton, Slider, StatBadge } from './ui';

interface ScriptEditorProps {
    scriptConfig: ScriptConfig;
    setScriptConfig: (config: ScriptConfig) => void;
    constraints?: ProjectConstraints;
}

const CANVAS_SIZE = 400;

const ScriptEditor: React.FC<ScriptEditorProps> = ({ scriptConfig, setScriptConfig, constraints }) => {
    const { t } = useTranslation();

    const [selectedChar, setSelectedChar] = useState<string>('a');
    const [isDirty, setIsDirty] = useState(false);
    const [sidebarSearch, setSidebarSearch] = useState('');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const svgRef = useRef<SVGSVGElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPoints, setCurrentPoints] = useState<{ x: number, y: number }[]>([]);
    const [activeStrokePath, setActiveStrokePath] = useState<string>('');
    const [activeShape, setActiveShape] = useState<{ x: number, y: number, w: number, h: number } | null>(null);

    const [strokes, setStrokes] = useState<GlyphStroke[]>([]);
    const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
    const [undoStack, setUndoStack] = useState<GlyphStroke[][]>([]);
    const [redoStack, setRedoStack] = useState<GlyphStroke[][]>([]);

    const [showGrid, setShowGrid] = useState(true);
    const [strokeWidth, setStrokeWidth] = useState(15);
    const [coords, setCoords] = useState({ x: 0, y: 0 });
    const [glyphColor, setGlyphColor] = useState('#ffffff');
    const [brushCap, setBrushCap] = useState<'round' | 'square'>('round');
    const [drawMode, setDrawMode] = useState<'free' | 'line' | 'rect' | 'circle' | 'eraser'>('free');
    const [canvasZoom, setCanvasZoom] = useState<number>(() => {
        const saved = localStorage.getItem('korelang_script_editor_zoom');
        return saved ? parseFloat(saved) : 1;
    });
    const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
    const [editingLayerId, setEditingLayerId] = useState<string | null>(null);


    useEffect(() => {
        localStorage.setItem('korelang_script_editor_zoom', canvasZoom.toString());
    }, [canvasZoom]);

    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'korelang_script_editor_zoom' && e.newValue) {
                setCanvasZoom(parseFloat(e.newValue));
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    // Sinkronisasi strokeWidth dengan layer aktif
    useEffect(() => {
        const activeLayer = strokes.find(s => s.id === activeLayerId);
        if (activeLayer && activeLayer.strokeWidth !== undefined) {
            setStrokeWidth(activeLayer.strokeWidth);
        }
        if (activeLayer && activeLayer.color) {
            setGlyphColor(activeLayer.color);
        }
    }, [activeLayerId]);

    useEffect(() => {
        const glyph = scriptConfig.glyphs.find(g => g.char === selectedChar);
        if (glyph && glyph.strokes && glyph.strokes.length > 0) {
            setStrokes(glyph.strokes);
            setActiveLayerId(glyph.strokes[glyph.strokes.length - 1].id);
        } else {
            const initialLayer: GlyphStroke = {
                id: 'layer-base-' + Date.now(),
                type: 'path',
                d: '',
                width: 0,
                strokeWidth: 15,
                cap: 'round',
                color: '#ffffff',
                visible: true,
                locked: false,
                label: 'Base Layer'
            };
            setStrokes([initialLayer]);
            setActiveLayerId(initialLayer.id);
        }
        setUndoStack([]);
        setRedoStack([]);
        setIsDirty(false);
    }, [selectedChar, scriptConfig]);

    const pushToUndo = useCallback(() => {
        setUndoStack(prev => [...prev, structuredClone(strokes)]);
        setRedoStack([]);
    }, [strokes]);

    const performUndo = useCallback(() => {
        if (undoStack.length === 0) return;
        const last = undoStack[undoStack.length - 1];
        setRedoStack(prev => [...prev, structuredClone(strokes)]);
        setStrokes(last);
        setUndoStack(prev => prev.slice(0, -1));
        setIsDirty(true);
    }, [undoStack, strokes]);

    const performRedo = useCallback(() => {
        if (redoStack.length === 0) return;
        const next = redoStack[redoStack.length - 1];
        setUndoStack(prev => [...prev, structuredClone(strokes)]);
        setStrokes(next);
        setRedoStack(prev => prev.slice(0, -1));
        setIsDirty(true);
    }, [redoStack, strokes]);

    const getClientCoords = (e: React.MouseEvent | React.TouchEvent) => {
        if ('touches' in e) {
            const touchEvent = e as unknown as React.TouchEvent;
            if (touchEvent.touches && touchEvent.touches.length > 0) {
                return { x: touchEvent.touches[0].clientX, y: touchEvent.touches[0].clientY };
            }
        }
        const mouseEvent = e as unknown as React.MouseEvent;
        return { x: mouseEvent.clientX, y: mouseEvent.clientY };
    };

    const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
        if (!svgRef.current) return { x: 0, y: 0 };
        const CTM = svgRef.current.getScreenCTM();
        if (!CTM) return { x: 0, y: 0 };
        const { x: clientX, y: clientY } = getClientCoords(e);
        const x = (clientX - CTM.e) / CTM.a;
        const y = (clientY - CTM.f) / CTM.d;
        return { x, y };
    };

    const performErase = useCallback((ex: number, ey: number) => {
        const threshold = strokeWidth;
        setStrokes((prev: GlyphStroke[]) => {
            const next = prev.map((s: GlyphStroke) => {
                if (s.locked || !s.visible) return s;

                if (s.type === 'path') {
                    const subpaths = s.d.split('M').filter(Boolean).map((sp: string) => 'M' + sp);
                    const newSubpaths: string[] = [];

                    subpaths.forEach((sp: string) => {
                        const isClosed = sp.toLowerCase().includes('z');
                        const coordsMatch = sp.match(/-?[0-9.]+/g);
                        if (!coordsMatch) return;
                        const coords: number[] = coordsMatch.map(Number);
                        if (coords.length < 2) return;

                        // If closed, add first point to end to represent the closing line
                        if (isClosed && coords.length >= 4) {
                            coords.push(coords[0], coords[1]);
                        }

                        let currentChain: string[] = [];

                        for (let i = 0; i < coords.length; i += 2) {
                            const x1 = coords[i], y1 = coords[i + 1];
                            const isPointErased = Math.hypot(ex - x1, ey - y1) < threshold / 2;

                            if (i + 3 < coords.length) {
                                const x2 = coords[i + 2], y2 = coords[i + 3];
                                const l2 = (x1 - x2) ** 2 + (y1 - y2) ** 2;
                                let t = l2 === 0 ? 0 : ((ex - x1) * (x2 - x1) + (ey - y1) * (y2 - y1)) / l2;
                                t = Math.max(0, Math.min(1, t));
                                const distToSegment = Math.hypot(ex - (x1 + t * (x2 - x1)), ey - (y1 + t * (y2 - y1)));
                                const isSegmentErased = distToSegment < threshold / 2;

                                if (isSegmentErased) {
                                    if (currentChain.length > 0) {
                                        newSubpaths.push('M ' + currentChain.join(' L '));
                                        currentChain = [];
                                    }
                                } else {
                                    if (currentChain.length === 0) currentChain.push(`${x1.toFixed(1)} ${y1.toFixed(1)}`);
                                    currentChain.push(`${x2.toFixed(1)} ${y2.toFixed(1)}`);
                                }
                            } else if (!isPointErased) {
                                if (currentChain.length === 0) currentChain.push(`${x1.toFixed(1)} ${y1.toFixed(1)}`);
                            }
                        }
                        if (currentChain.length > 0) {
                            newSubpaths.push('M ' + currentChain.join(' L '));
                        }
                    });

                    if (newSubpaths.length === subpaths.length && newSubpaths.join(' ') === subpaths.join(' ')) return s;
                    return { ...s, d: newSubpaths.join(' ').trim() };
                }

                return s;
            }).filter((s: GlyphStroke | null): s is GlyphStroke => s !== null && (s.type !== 'path' || s.d.trim() !== ''));

            if (next.length !== prev.length || next.some((s: GlyphStroke, i: number) => s.d !== (prev[i] as GlyphStroke).d)) {
                setIsDirty(true);
            }
            return next;
        });
    }, [strokeWidth]);

    const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
        const isRightClick = 'button' in e && e.button === 2;
        const { x: clientX, y: clientY } = getClientCoords(e);

        if (isRightClick) {
            e.preventDefault();
            setIsPanning(true);
            setLastMousePos({ x: clientX, y: clientY });
            return;
        }

        // Only start drawing if clicking on the SVG or its descendants
        const target = e.target as HTMLElement;
        const isCanvas = target.closest('svg') === svgRef.current;
        if (!isCanvas) return;

        const activeLayer = strokes.find(s => s.id === activeLayerId);
        if (activeLayer?.locked || activeLayer?.type === 'image') return;

        e.preventDefault();
        pushToUndo();
        setIsDrawing(true);
        setIsDirty(true);
        const { x, y } = getCoordinates(e);
        if (drawMode === 'eraser') {
            performErase(x, y);
        } else {
            setCurrentPoints([{ x, y }]);
            if (drawMode === 'free' || drawMode === 'line') {
                setActiveStrokePath(`M ${x.toFixed(1)} ${y.toFixed(1)}`);
            } else {
                setActiveShape({ x, y, w: 0, h: 0 });
            }
        }
    };

    const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
        const { x: clientX, y: clientY } = getClientCoords(e);

        if (isPanning) {
            e.preventDefault();
            const dx = clientX - lastMousePos.x;
            const dy = clientY - lastMousePos.y;
            setCanvasOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
            setLastMousePos({ x: clientX, y: clientY });
            return;
        }

        const { x, y } = getCoordinates(e);
        setCoords({ x, y });
        if (!isDrawing) return;
        e.preventDefault();

        if (drawMode === 'free') {
            setCurrentPoints(prev => [...prev, { x, y }]);
            setActiveStrokePath(prev => `${prev} L ${x.toFixed(1)} ${y.toFixed(1)}`);
        } else if (drawMode === 'eraser') {
            performErase(x, y);
        } else if (drawMode === 'line') {
            const start = currentPoints[0];
            setActiveStrokePath(`M ${start.x.toFixed(1)} ${start.y.toFixed(1)} L ${x.toFixed(1)} ${y.toFixed(1)}`);
        } else if (activeShape) {
            setActiveShape({ ...activeShape, w: x - activeShape.x, h: y - activeShape.y });
        }
    };

    const handleEnd = () => {
        setIsPanning(false);
        if (!isDrawing) return;
        setIsDrawing(false);

        const currentWidth = strokeWidth;

        setStrokes(prev => {
            const nextStrokes = [...prev];
            const activeIdx = nextStrokes.findIndex(s => s.id === activeLayerId);

            if (drawMode === 'eraser') return prev;

            if (activeIdx !== -1 && nextStrokes[activeIdx].type === 'path' && !nextStrokes[activeIdx].locked && (drawMode === 'free' || drawMode === 'line')) {
                nextStrokes[activeIdx] = {
                    ...nextStrokes[activeIdx],
                    d: nextStrokes[activeIdx].d + ` ${activeStrokePath}`,
                    strokeWidth: currentWidth,
                    color: glyphColor,
                    cap: brushCap
                };
                return nextStrokes;
            } else {
                const newId = 'layer-' + Date.now();
                let newStroke: GlyphStroke | null = null;

                if (drawMode === 'free' || drawMode === 'line') {
                    if (activeStrokePath) {
                        newStroke = {
                            id: newId, type: 'path', d: activeStrokePath, width: currentWidth,
                            strokeWidth: currentWidth, cap: brushCap, color: glyphColor, visible: true, locked: false,
                            label: `Layer ${prev.length + 1}`
                        };
                    }
                } else if (activeShape) {
                    const { x, y, w, h } = activeShape;
                    if (drawMode === 'rect') {
                        const step = 5;
                        let path = `M ${x} ${y}`;

                        // Top edge
                        for (let i = step; i < Math.abs(w); i += step) {
                            path += ` L ${(x + (w > 0 ? i : -i)).toFixed(1)} ${y.toFixed(1)}`;
                        }
                        path += ` L ${(x + w).toFixed(1)} ${y.toFixed(1)}`;

                        // Right edge
                        for (let i = step; i < Math.abs(h); i += step) {
                            path += ` L ${(x + w).toFixed(1)} ${(y + (h > 0 ? i : -i)).toFixed(1)}`;
                        }
                        path += ` L ${(x + w).toFixed(1)} ${(y + h).toFixed(1)}`;

                        // Bottom edge
                        for (let i = step; i < Math.abs(w); i += step) {
                            path += ` L ${(x + w - (w > 0 ? i : -i)).toFixed(1)} ${(y + h).toFixed(1)}`;
                        }
                        path += ` L ${x.toFixed(1)} ${(y + h).toFixed(1)}`;

                        // Left edge
                        for (let i = step; i < Math.abs(h); i += step) {
                            path += ` L ${x.toFixed(1)} ${(y + h - (h > 0 ? i : -i)).toFixed(1)}`;
                        }
                        path += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;

                        newStroke = {
                            id: newId, type: 'path', d: path,
                            strokeWidth: currentWidth, cap: brushCap, color: glyphColor,
                            visible: true, locked: false, label: `Rectangle ${prev.length + 1}`,
                            width: Math.abs(w), height: Math.abs(h), x: Math.min(x, x + w), y: Math.min(y, y + h)
                        };
                    } else if (drawMode === 'circle') {
                        const radius = Math.sqrt(w * w + h * h);
                        const segments = 32;
                        let path = `M ${x + radius} ${y}`;
                        for (let i = 1; i <= segments; i++) {
                            const angle = (i / segments) * Math.PI * 2;
                            path += ` L ${(x + radius * Math.cos(angle)).toFixed(1)} ${(y + radius * Math.sin(angle)).toFixed(1)}`;
                        }
                        newStroke = {
                            id: newId, type: 'path', d: path,
                            strokeWidth: currentWidth, cap: brushCap, color: glyphColor,
                            visible: true, locked: false, label: `Circle ${prev.length + 1}`,
                            x, y, width: radius * 2, radius
                        };
                    }
                }
                if (newStroke) {
                    setActiveLayerId(newId);
                    return [...prev, newStroke];
                }
            }
            return prev;
        });

        setActiveStrokePath('');
        setActiveShape(null);
        setCurrentPoints([]);
    };

    const handleCanvasWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setCanvasZoom(p => Math.min(Math.max(p + delta, 0.5), 4));
    };

    const zoomIn = () => setCanvasZoom(p => Math.min(p + 0.2, 4));
    const zoomOut = () => setCanvasZoom(p => Math.max(p - 0.2, 0.5));
    const resetZoom = () => {
        setCanvasZoom(1);
        setCanvasOffset({ x: 0, y: 0 });
    };

    const renameLayer = (id: string, newLabel: string) => {
        setStrokes(prev => prev.map(s => s.id === id ? { ...s, label: newLabel } : s));
        setIsDirty(true);
    };

    const addNewLayer = () => {
        const newId = 'layer-man-' + Date.now();
        const newLayer: GlyphStroke = {
            id: newId, type: 'path', d: '', width: 0, strokeWidth: strokeWidth, cap: 'round', color: glyphColor,
            visible: true, locked: false, label: `New Layer ${strokes.length + 1}`
        };
        setStrokes([...strokes, newLayer]);
        setActiveLayerId(newId);
        setIsDirty(true);
    };

    const moveLayer = (id: string, dir: 'up' | 'down') => {
        const idx = strokes.findIndex(s => s.id === id);
        if (idx === -1) return;
        if (dir === 'up' && idx === strokes.length - 1) return;
        if (dir === 'down' && idx === 0) return;

        const nextStrokes = [...strokes];
        const targetIdx = dir === 'up' ? idx + 1 : idx - 1;
        [nextStrokes[idx], nextStrokes[targetIdx]] = [nextStrokes[targetIdx], nextStrokes[idx]];
        setStrokes(nextStrokes);
        setIsDirty(true);
    };

    const calculateGlyphWidth = (strokes: GlyphStroke[]) => {
        let maxX = 50;
        strokes.forEach(s => {
            if (!s.visible) return;
            if (s.type === 'path') {
                const matches = s.d.match(/([0-9.]+)\s+([0-9.]+)/g);
                if (matches) {
                    matches.forEach(m => {
                        const x = parseFloat(m.split(/\s+/)[0]);
                        if (x > maxX) maxX = x;
                    });
                }
            } else if (s.x !== undefined && s.width !== undefined) {
                if (s.x + s.width > maxX) maxX = s.x + s.width;
            }
        });
        return Math.min(CANVAS_SIZE, Math.max(50, maxX + 20));
    };

    // Mémoiser la liste filtrée des caractères
    const filteredChars = useMemo(() =>
        Array.from({ length: 94 }, (_, i) => String.fromCharCode(i + 33))
            .filter(c => !sidebarSearch || c.toLowerCase().includes(sidebarSearch.toLowerCase()))
        , [sidebarSearch]);

    const saveGlyph = () => {
        const calculatedWidth = calculateGlyphWidth(strokes);
        const newGlyph: ScriptGlyph = {
            char: selectedChar,
            pua: `\\u${(0xE000 + selectedChar.charCodeAt(0)).toString(16).toUpperCase()}`,
            strokes: strokes,
            viewWidth: calculatedWidth
        };
        const existingIdx = scriptConfig.glyphs.findIndex(g => g.char === selectedChar);
        let newGlyphs = [...scriptConfig.glyphs];
        if (existingIdx >= 0) newGlyphs[existingIdx] = newGlyph;
        else newGlyphs.push(newGlyph);
        setScriptConfig({ ...scriptConfig, glyphs: newGlyphs });
        setIsDirty(false);
    };

    const toggleSpacingMode = () => {
        setScriptConfig({
            ...scriptConfig,
            spacingMode: scriptConfig.spacingMode === 'proportional' ? 'mono' : 'proportional'
        });
    };

    const importImageLayer = (base64: string) => {
        const newId = 'img-' + Date.now();
        const imageLayer: GlyphStroke = {
            id: newId, type: 'image', d: '', width: CANVAS_SIZE, height: CANVAS_SIZE, x: 0, y: 0,
            strokeWidth: 0, cap: 'round', color: '', visible: true, locked: false,
            label: `Reference Matrix`, imageUrl: base64, opacity: 0.5
        };
        setStrokes([imageLayer, ...strokes]);
        setActiveLayerId(newId);
        setIsDirty(true);
    };

    // Handlers optimisés avec useCallback
    const handleStrokeWidthChange = useCallback((newWidth: number) => {
        setStrokeWidth(newWidth);
        if (activeLayerId) {
            setStrokes(prev => prev.map(s => s.id === activeLayerId ? { ...s, strokeWidth: newWidth } : s));
            setIsDirty(true);
        }
    }, [activeLayerId]);

    const handleColorChange = useCallback((newColor: string) => {
        setGlyphColor(newColor);
        if (activeLayerId) {
            setStrokes(prev => prev.map(s => s.id === activeLayerId ? { ...s, color: newColor } : s));
            setIsDirty(true);
        }
    }, [activeLayerId]);

    const toggleLayerLock = useCallback((id: string) => {
        setStrokes(prev => prev.map(l => l.id === id ? { ...l, locked: !l.locked } : l));
    }, []);

    const toggleLayerVisibility = useCallback((id: string) => {
        setStrokes(prev => prev.map(l => l.id === id ? { ...l, visible: !l.visible } : l));
    }, []);

    const toggleLayerOpacity = useCallback((id: string) => {
        setStrokes(prev => prev.map(l => l.id === id ? { ...l, opacity: (l.opacity === 1 || !l.opacity) ? 0.4 : 1 } : l));
        setIsDirty(true);
    }, []);

    const deleteLayer = useCallback((id: string) => {
        setStrokes(prev => prev.filter(l => l.id !== id));
        if (activeLayerId === id) setActiveLayerId(null);
    }, [activeLayerId]);

    return (
        <ViewLayout
            icon={Feather}
            title={t('script.title')}
            subtitle={t('script.engine_subtitle')}
            noScroll
            height="h-16"
            headerBgColor="var(--surface)"
            hideTitle
            headerChildren={
                <div className="flex-1 flex items-center justify-between text-slate-200 gap-6">
                    <div className="flex items-center gap-6">
                        <div className="flex gap-0 rounded h-[32px] border border-neutral-800/50" style={{ backgroundColor: 'var(--background)' }}>
                            <ToggleButton
                                isActive={scriptConfig.spacingMode === 'proportional'}
                                onClick={toggleSpacingMode}
                                icon={<Type size={14} />}
                                label={t('script.spacing_proportional')}
                                title={t('script.spacing_proportional_desc')}
                                position="first"
                            />
                            <ToggleButton
                                isActive={scriptConfig.spacingMode === 'mono'}
                                onClick={toggleSpacingMode}
                                icon={<Grid size={14} />}
                                label={t('script.spacing_mono')}
                                title={t('script.spacing_mono_desc')}
                                position="last"
                            />
                        </div>

                        <div className="h-8 w-[1px] bg-neutral-800/50"></div>

                        {/* Direction Controls */}
                        <div className="flex gap-0 rounded h-[32px] border border-neutral-800/50" style={{ backgroundColor: 'var(--background)' }}>
                            <ToggleButton
                                isActive={!scriptConfig.direction || scriptConfig.direction === 'ltr'}
                                onClick={() => setScriptConfig({ ...scriptConfig, direction: 'ltr' })}
                                icon={<ArrowRight size={14} />}
                                label="LTR"
                                title="Left to Right"
                                position="first"
                            />
                            <ToggleButton
                                isActive={scriptConfig.direction === 'rtl'}
                                onClick={() => setScriptConfig({ ...scriptConfig, direction: 'rtl' })}
                                icon={<ArrowLeft size={14} />}
                                label="RTL"
                                title="Right to Left"
                                position="middle"
                            />
                            <ToggleButton
                                isActive={scriptConfig.direction === 'ttb'}
                                onClick={() => setScriptConfig({ ...scriptConfig, direction: 'ttb' })}
                                icon={<ArrowDown size={14} />}
                                label="V-RTL"
                                title="Vertical (Right to Left)"
                                position="middle"
                            />
                            <ToggleButton
                                isActive={scriptConfig.direction === 'ttb-ltr'}
                                onClick={() => setScriptConfig({ ...scriptConfig, direction: 'ttb-ltr' })}
                                icon={<ArrowDown size={14} className="rotate-0" />}
                                label="V-LTR"
                                title="Vertical (Left to Right)"
                                position="last"
                            />
                        </div>

                        <div className="h-8 w-[1px] bg-neutral-800/50"></div>

                        {/* Integrated Brush Controls */}
                        <div className="flex items-center gap-4 bg-black/20 px-3 py-1 rounded-lg border border-neutral-800/30">
                            <label className="relative cursor-pointer flex items-center justify-center group" title="Brush Color">
                                <Palette size={18} style={{ color: glyphColor }} className="transition-transform group-hover:scale-110" />
                                <input type="color" value={glyphColor} onChange={(e) => handleColorChange(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
                            </label>

                            <div className="flex items-center gap-3 min-w-[240px]">
                                <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest">Size</span>
                                <Slider
                                    value={strokeWidth}
                                    onChange={handleStrokeWidthChange}
                                    min={1}
                                    max={60}
                                    className="flex-1"
                                />
                                <input
                                    type="number"
                                    value={strokeWidth || ''}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === '') {
                                            setStrokeWidth(0);
                                        } else {
                                            const num = parseInt(val);
                                            if (!isNaN(num)) handleStrokeWidthChange(Math.min(60, num));
                                        }
                                    }}
                                    onBlur={() => {
                                        if (strokeWidth < 1) handleStrokeWidthChange(1);
                                    }}
                                    min={1}
                                    max={60}
                                    className="w-12 bg-black/40 border border-neutral-800/50 rounded px-1 text-xs font-mono font-bold text-[var(--accent)] text-center focus:outline-none focus:border-[var(--accent)] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                            </div>
                        </div>
                    </div>

                    <CompactButton
                        onClick={saveGlyph}
                        variant="solid"
                        color={isDirty ? 'var(--accent)' : 'var(--text-secondary)'}
                        icon={<Save size={16} />}
                        label={isDirty ? t('script.commit') : t('script.synced')}
                        className="h-[36px] px-6 rounded-lg shadow-lg shadow-black/20"
                    />
                </div>
            }
        >

            <div className="flex-1 flex overflow-hidden bg-[var(--background)] text-slate-200">
                {/* Left Sidebar: Drawing Controls */}
                <div className="w-16 border-r border-neutral-800 bg-[var(--surface)]/50 flex flex-col items-center py-4 gap-6">
                    <div className="flex flex-col gap-2">
                        {(
                            [
                                { mode: 'free', icon: <Spline size={20} />, title: t('script.tool_freehand_title') },
                                { mode: 'line', icon: <Minus size={20} />, title: t('script.tool_line_title') },
                                { mode: 'circle', icon: <Circle size={20} />, title: t('script.tool_circle_title') },
                                { mode: 'rect', icon: <Square size={20} />, title: t('script.tool_rect_title') },
                                { mode: 'eraser', icon: <Eraser size={20} />, title: t('script.tool_eraser_title') || 'Eraser' }
                            ] as const
                        ).map(item => (
                            <CompactButton
                                key={item.mode}
                                onClick={() => setDrawMode(item.mode)}
                                variant={drawMode === item.mode ? 'solid' : 'ghost'}
                                color="var(--accent)"
                                icon={item.icon}
                                label=""
                                className="p-2.5"
                                title={item.title}
                            />
                        ))}
                    </div>

                    <div className="w-8 h-[1px] bg-neutral-800"></div>

                    <div className="w-8 h-[1px] bg-neutral-800"></div>

                    <div className="flex flex-col items-center gap-2">
                        <CompactButton
                            onClick={performUndo}
                            disabled={undoStack.length === 0}
                            variant="ghost"
                            color="var(--text-secondary)"
                            icon={<RotateCcw size={20} />}
                            label=""
                            className="p-2.5"
                            title="Undo"
                        />
                        <CompactButton
                            onClick={performRedo}
                            disabled={redoStack.length === 0}
                            variant="ghost"
                            color="var(--text-secondary)"
                            icon={<RotateCw size={20} />}
                            label=""
                            className="p-2.5"
                            title="Redo"
                        />
                    </div>
                </div>

                {/* Center: Workspace & Canvas */}
                <div
                    className="flex-1 w-full h-full flex flex-col items-center justify-center relative bg-[var(--background)] overflow-hidden cursor-move"
                    onWheel={handleCanvasWheel}
                    onMouseDown={handleStart}
                    onMouseMove={handleMove}
                    onMouseUp={handleEnd}
                    onMouseLeave={handleEnd}
                    onTouchStart={handleStart}
                    onTouchMove={handleMove}
                    onTouchEnd={handleEnd}
                    onContextMenu={(e) => e.preventDefault()}
                >
                    <div
                        className={`relative w-[400px] h-[400px] rounded-xl shadow-2xl overflow-hidden cursor-crosshair touch-none select-none border ${!isPanning ? 'transition-transform duration-150 ease-out' : ''}`}
                        style={{
                            transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${canvasZoom})`,
                            backgroundColor: 'rgb(from var(--background) r g b / 0.4)',
                            borderColor: 'rgb(from var(--border) r g b / 0.5)',
                            backgroundImage: showGrid ? 'radial-gradient(rgb(from var(--text-secondary) r g b / 0.1) 1px, transparent 1px)' : 'none',
                            backgroundSize: '20px 20px'
                        }}
                    >
                        <svg ref={svgRef} viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`} className="w-full h-full">
                            {strokes.map((s) => s.visible && (
                                s.type === 'image' ? (
                                    <image key={s.id} href={s.imageUrl} x={s.x} y={s.y} width={s.width} height={s.height} opacity={s.opacity} className={activeLayerId === s.id ? 'outline outline-2 outline-[var(--accent)]' : ''} />
                                ) : (
                                    <path
                                        key={s.id}
                                        d={s.d}
                                        stroke={s.color}
                                        strokeWidth={s.strokeWidth}
                                        fill="none"
                                        strokeLinecap={s.cap}
                                        strokeLinejoin="round"
                                        strokeOpacity={s.locked ? 0.3 : 1}
                                        style={activeLayerId === s.id ? { filter: 'drop-shadow(0px 0px 8px rgb(from var(--accent) r g b / 0.4))' } : {}}
                                    />
                                )
                            ))}
                            {activeStrokePath && <path d={activeStrokePath} stroke={glyphColor} strokeWidth={strokeWidth} fill="none" strokeLinecap={brushCap} strokeLinejoin="round" strokeOpacity="0.8" />}
                            {activeShape && drawMode === 'rect' && <rect x={activeShape.w < 0 ? activeShape.x + activeShape.w : activeShape.x} y={activeShape.h < 0 ? activeShape.y + activeShape.h : activeShape.y} width={Math.abs(activeShape.w)} height={Math.abs(activeShape.h)} stroke={glyphColor} strokeWidth={strokeWidth} fill="none" strokeOpacity="0.5" />}
                            {activeShape && drawMode === 'circle' && <circle cx={activeShape.x} cy={activeShape.y} r={Math.sqrt((activeShape.w || 0) ** 2 + (activeShape.h || 0) ** 2)} stroke={glyphColor} strokeWidth={strokeWidth} fill="none" strokeOpacity="0.5" />}
                        </svg>
                    </div>

                    {/* Stats Widget (Top Right) */}
                    <div className="absolute z-10 flex items-center gap-2 top-4 right-4">
                        <StatBadge value={Math.round(coords.x)} label="X POS" />
                        <StatBadge value={Math.round(coords.y)} label="Y POS" />
                        <StatBadge value={strokes.length} label="LAYERS" />
                    </div>

                    {/* Floating Widgets Container (Bottom Corners) */}
                    <div className="absolute z-10 inset-x-4 bottom-4 flex items-end justify-between pointer-events-none">
                        {/* Floating Neural Layer Stack (Bottom Left) */}
                        <Card onWheel={(e: React.WheelEvent) => e.stopPropagation()} className="w-64 backdrop-blur-md bg-black/60 border-neutral-800 shadow-2xl flex flex-col max-h-[450px] pointer-events-auto overflow-hidden rounded-xl">
                            <div className="flex items-center justify-between p-3 border-b border-neutral-800/50 bg-white/5">
                                <div className="flex items-center gap-2">
                                    <Layers size={14} className="text-[var(--accent)]" />
                                    <span className="text-[10px] font-bold tracking-widest uppercase text-neutral-400">Neural Layer Stack</span>
                                </div>
                                <CompactButton onClick={addNewLayer} variant="solid" color="var(--accent)" icon={<Plus size={14} />} label="" className="p-1" title={t('script.add_layer_title')} />
                            </div>
                            <div className="flex-1 p-2 space-y-2 overflow-y-auto custom-scrollbar">
                                {[...strokes].reverse().map((s, revIdx) => {
                                    const actualIdx = strokes.length - 1 - revIdx;
                                    const isEditing = editingLayerId === s.id;
                                    return (
                                        <div key={s.id} style={{
                                            outline: activeLayerId === s.id ? '2px solid rgb(from var(--accent) r g b / 0.5)' : 'none',
                                            outlineOffset: activeLayerId === s.id ? '2px' : '0px',
                                            transition: 'outline 150ms ease'
                                        }}>
                                            <Card onClick={() => setActiveLayerId(s.id)} className={`p-2 flex items-center justify-between transition-all cursor-pointer bg-black/20 hover:bg-white/5 border-neutral-800/50 group`}>
                                                <div className="flex items-center flex-1 gap-3 overflow-hidden">
                                                    <div className="flex flex-col gap-0.5">
                                                        <button disabled={actualIdx === strokes.length - 1} onClick={(e) => { e.stopPropagation(); moveLayer(s.id, 'up'); }} className="p-0.5 text-neutral-700 disabled:opacity-10" style={{ color: 'var(--text-secondary)' }} onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)'; }} onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}><ChevronUp size={12} /></button>
                                                        <button disabled={actualIdx === 0} onClick={(e) => { e.stopPropagation(); moveLayer(s.id, 'down'); }} className="p-0.5 text-neutral-700 disabled:opacity-10" style={{ color: 'var(--text-secondary)' }} onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)'; }} onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}><ChevronDown size={12} /></button>
                                                    </div>
                                                    <div className="relative flex items-center justify-center w-10 h-10 overflow-hidden bg-black/40 border rounded border-neutral-800 shrink-0">
                                                        {s.type === 'image' ? (
                                                            <img src={s.imageUrl} className="object-cover w-full h-full" style={{ opacity: s.opacity || 1 }} />
                                                        ) : (
                                                            <svg viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`} className="w-8 h-8">
                                                                <path d={s.d} stroke={s.color} strokeWidth={s.strokeWidth * 1.5} fill="none" strokeLinecap="round" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col flex-1 min-w-0">
                                                        {isEditing ? (
                                                            <input
                                                                autoFocus
                                                                value={s.label}
                                                                onBlur={() => setEditingLayerId(null)}
                                                                onKeyDown={(e) => e.key === 'Enter' && setEditingLayerId(null)}
                                                                onChange={(e) => renameLayer(s.id, e.target.value)}
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="bg-slate-900 border rounded px-1 py-0.5 text-[10px] text-white outline-none w-full" style={{ borderColor: 'var(--accent)', borderWidth: '1px' }}
                                                            />
                                                        ) : (
                                                            <div className="flex items-center gap-2 group/label">
                                                                <span className={`text-[10px] font-bold truncate`} style={{ color: activeLayerId === s.id ? 'var(--accent)' : 'var(--text-secondary)' }}>{s.label}</span>
                                                                <button onClick={(e) => { e.stopPropagation(); setEditingLayerId(s.id); }} className="opacity-0 group-hover/label:opacity-100 text-neutral-600" style={{ color: 'var(--text-secondary)' }} onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)'; }} onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}><Edit3 size={10} /></button>
                                                            </div>
                                                        )}
                                                        <span className="text-[8px] text-neutral-600 uppercase font-mono">{s.type} {s.type !== 'image' && `• ${s.strokeWidth}pt`}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {s.type === 'image' && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); toggleLayerOpacity(s.id); }}
                                                            className={`p-1 rounded hover:bg-neutral-800 ${(s.opacity === 1 || !s.opacity) ? 'text-neutral-600' : 'text-cyan-400'}`}
                                                            title="Toggle Transparency"
                                                        >
                                                            <Sun size={12} />
                                                        </button>
                                                    )}
                                                    <button onClick={(e) => { e.stopPropagation(); toggleLayerLock(s.id); }} className={`p-1 rounded hover:bg-neutral-800 ${s.locked ? 'text-amber-500' : 'text-neutral-600'}`}>
                                                        {s.locked ? <Lock size={12} /> : <Unlock size={12} />}
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); toggleLayerVisibility(s.id); }} className={`p-1 rounded hover:bg-neutral-800 ${s.visible ? 'text-neutral-500' : 'text-blue-500'}`}>{s.visible ? <Eye size={12} /> : <EyeOff size={12} />}</button>
                                                    <button
                                                        disabled={strokes.length <= 1}
                                                        onClick={(e) => { e.stopPropagation(); deleteLayer(s.id); }}
                                                        className={`p-1 rounded hover:bg-red-900/20 ${strokes.length <= 1 ? 'text-neutral-800 cursor-not-allowed' : 'text-neutral-700 hover:text-red-500'}`}
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </Card>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="p-3 border-t border-neutral-800/50 bg-white/5">
                                <CompactButton onClick={() => fileInputRef.current?.click()} variant="ghost" color="var(--text-secondary)" icon={<ImageIcon size={12} />} label={t('script.import_reference')} className="justify-center w-full text-[10px]" />
                                <input type="file" ref={fileInputRef} onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        const reader = new FileReader();
                                        reader.onloadend = () => { importImageLayer(reader.result as string); };
                                        reader.readAsDataURL(file);
                                    }
                                }} accept="image/*" className="hidden" />
                            </div>
                        </Card>

                        {/* Vertical Zoom Widget (Bottom Right) */}
                        <Card className="flex flex-col bg-black/60 backdrop-blur-md border-neutral-800 shadow-2xl overflow-hidden rounded-xl pointer-events-auto">
                            <button
                                onClick={zoomIn}
                                className="p-3 hover:bg-[var(--accent)] text-white/50 hover:text-white transition-all duration-200"
                                title="Zoom In"
                            >
                                <ZoomIn size={22} />
                            </button>
                            <div className="w-full h-[1px] bg-neutral-800/50"></div>
                            <button
                                onClick={resetZoom}
                                className="py-2 px-1 text-[11px] font-mono font-bold text-[var(--accent)] hover:bg-white/5 transition-colors"
                                title="Reset Zoom"
                            >
                                {Math.round(canvasZoom * 100)}%
                            </button>
                            <div className="w-full h-[1px] bg-neutral-800/50"></div>
                            <button
                                onClick={zoomOut}
                                className="p-3 hover:bg-white/10 text-white/50 hover:text-white transition-all duration-200"
                                title="Zoom Out"
                            >
                                <ZoomOut size={22} />
                            </button>
                        </Card>
                    </div>
                </div>

                {/* Right Sidebar: Symbols Map */}
                <div className={`border-l border-neutral-800 flex flex-col bg-[var(--surface)]/50 transition-all duration-300 ${sidebarCollapsed ? 'w-12' : 'w-72'}`}>
                    <Card className="flex items-center justify-between p-3 border-b-0 rounded-none bg-black/20">
                        {!sidebarCollapsed && <span className="text-xs font-bold tracking-widest uppercase text-neutral-400">{t('script.symbol_map')}</span>}
                        <CompactButton
                            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                            variant="ghost"
                            color="var(--text-secondary)"
                            icon={sidebarCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                            label=""
                            className="p-1"
                        />
                    </Card>

                    {!sidebarCollapsed && (
                        <div className="p-2 border-b border-neutral-800">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={14} />
                                <input
                                    value={sidebarSearch}
                                    onChange={(e) => setSidebarSearch(e.target.value)}
                                    placeholder={t('script.find_placeholder')}
                                    className="w-full bg-slate-900/50 border border-neutral-800 rounded-lg py-2 pl-9 pr-4 text-xs text-white outline-none focus:border-[var(--accent)] transition-colors"
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex flex-wrap content-start flex-1 gap-1 p-2 overflow-y-auto custom-scrollbar">
                        {filteredChars.map(char => {
                            const glyph = scriptConfig.glyphs.find(g => g.char === char);
                            const hasGlyph = !!glyph;
                            const active = selectedChar === char;
                            return (
                                <CompactButton
                                    key={char}
                                    onClick={() => setSelectedChar(char)}
                                    variant={active ? 'solid' : 'ghost'}
                                    color="var(--accent)"
                                    icon={
                                        <div className="relative flex items-center justify-center w-full h-full font-mono text-sm font-bold">
                                            {hasGlyph ? (
                                                <div className="flex items-center justify-center w-full h-full p-2 overflow-hidden">
                                                    <ConScriptText text={char} scriptConfig={scriptConfig} />
                                                </div>
                                            ) : (
                                                char
                                            )}
                                            {hasGlyph && <span className="absolute w-2 h-2 border-2 rounded-full top-1 right-1 bg-emerald-400 border-neutral-950"></span>}
                                        </div>
                                    }
                                    label=""
                                    className="w-12 h-12 p-0"
                                />
                            );
                        })}
                    </div>
                </div>
            </div>
        </ViewLayout>
    );
};

export default ScriptEditor;
