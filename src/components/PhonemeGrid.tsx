import React from 'react';
import { X, Plus } from 'lucide-react';
import { Phoneme } from '../types';
import { Card, Section } from './ui';
import { useTranslation } from '../i18n';

const MANNERS = ['plosive', 'nasal', 'trill', 'tap', 'fricative', 'lateral-fricative', 'approximant', 'lateral-approximant'];
const PLACES = ['bilabial', 'labiodental', 'dental', 'alveolar', 'postalveolar', 'retroflex', 'palatal', 'velar', 'uvular', 'pharyngeal', 'glottal'];
const HEIGHTS = ['close', 'near-close', 'close-mid', 'mid', 'open-mid', 'near-open', 'open'];
const BACKNESS = ['front', 'central', 'back'];

export interface PhonemeGridProps {
    title: string;
    icon: React.ReactNode;
    isVowels: boolean;
    getPhonemes: (row: string, col: string) => Phoneme[];
    onCellClick: (row: string, col: string) => void;
    onRemove: (phoneme: Phoneme) => void;
    renderPhoneme: (phoneme: Phoneme) => React.ReactNode;
    minWidth?: number;
    legend?: React.ReactNode;
    unclassified?: {
        items: Phoneme[];
        titleKey: string;
        position?: 'top' | 'bottom';
        renderItem?: (phoneme: Phoneme, index: number) => React.ReactNode;
    };
}

const PhonemeGrid: React.FC<PhonemeGridProps> = ({
    title,
    icon,
    isVowels,
    getPhonemes,
    onCellClick,
    onRemove,
    renderPhoneme,
    minWidth = 600,
    legend,
    unclassified,
}) => {
    const { t } = useTranslation();
    
    const columns = isVowels ? BACKNESS : PLACES;
    const rows = isVowels ? HEIGHTS : MANNERS;
    const columnLabel = (key: string) => t(`phonology.${isVowels ? 'backness' : 'place'}.${key}`);
    const rowLabel = (key: string) => t(`phonology.${isVowels ? 'height' : 'manner'}.${key}`);
    return (
    <Card className="p-6 overflow-x-auto">
        <Section title={title} icon={icon} className="mb-6" />

        {unclassified?.items?.length && unclassified.position !== 'bottom' ? (
            <div className="p-3 mb-4 text-sm border rounded bg-neutral-900 border-neutral-800 text-neutral-200">
                <div className="mb-2 text-xs text-neutral-400">{t(unclassified.titleKey)}</div>
                <div className="flex flex-wrap gap-2">
                    {unclassified.items.map((p, i) => unclassified.renderItem ? unclassified.renderItem(p, i) : (
                        <span key={`unclassified-${i}`} className="px-2 py-1 font-serif text-lg rounded bg-neutral-800">{p.symbol}</span>
                    ))}
                </div>
            </div>
        ) : null}

        <table className="border-collapse inline-table" style={{ minWidth: `${minWidth}px` }}>
            <thead>
                <tr>
                    <th className="w-4 p-0"></th>
                    {columns.map(col => (
                        <th key={col} className="p-2 text-xs font-bold text-center uppercase" style={{ color: 'var(--text-tertiary)' }}>
                            {columnLabel(col)}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.map((row, rowIdx) => (
                    <tr key={row} className={rowIdx === 0 ? '' : 'border-t'} style={{ borderColor: 'var(--text-tertiary)' }}>
                        <th className="py-2 pl-0 pr-2 text-xs font-bold text-left uppercase whitespace-nowrap" style={{ color: 'var(--text-tertiary)' }}>
                            {rowLabel(row)}
                        </th>
                        {columns.map((col, colIdx) => {
                            const phonemes = getPhonemes(row, col).filter(p => p.symbol);
                            return (
                                <td
                                    key={`${row}-${col}`}
                                    className={`p-2 text-center transition-colors cursor-pointer group hover:bg-[var(--surface)] ${colIdx === 0 ? 'border-l' : 'border-l'}`}
                                    style={{ borderColor: 'var(--text-tertiary)' }}
                                    onClick={() => onCellClick(row, col)}
                                >
                                    <div className="flex justify-center gap-2 items-center min-h-[30px]">
                                        {phonemes.length > 0 ? (
                                            phonemes.map((p, idx) => (
                                                <div key={`${row}-${col}-${idx}-${p.symbol}`} className="relative group/ph">
                                                    {renderPhoneme(p)}
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); onRemove(p); }}
                                                        className="absolute hidden text-red-500 rounded-full -top-4 -right-2 group-hover/ph:block hover:text-red-400 bg-neutral-950"
                                                    >
                                                        <X size={10} />
                                                    </button>
                                                </div>
                                            ))
                                        ) : (
                                            <Plus
                                                size={12}
                                                className="transition-colors"
                                                style={{ color: 'var(--text-tertiary)' }}
                                            />
                                        )}
                                    </div>
                                </td>
                            );
                        })}
                    </tr>
                ))}
            </tbody>
        </table>

        {legend ? (
            <div className="mt-4 text-xs text-center" style={{ color: 'var(--text-tertiary)' }}>
                {legend}
            </div>
        ) : null}

        {unclassified?.items?.length && unclassified.position === 'bottom' ? (
            <div className="p-3 mt-4 text-sm border rounded bg-neutral-900 border-neutral-800 text-neutral-200">
                <div className="mb-2 text-xs text-neutral-400">{t(unclassified.titleKey)}</div>
                <div className="flex flex-wrap gap-2">
                    {unclassified.items.map((p, i) => unclassified.renderItem ? unclassified.renderItem(p, i) : (
                        <span key={`unclassified-bottom-${i}`} className="px-2 py-1 font-serif text-lg rounded bg-neutral-800">{p.symbol}</span>
                    ))}
                </div>
            </div>
        ) : null}
    </Card>
    );
};

export default PhonemeGrid;
