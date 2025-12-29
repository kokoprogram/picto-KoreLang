import React, { useState, useEffect } from 'react';
import { X, Moon, Sun, Cpu, Palette, Download, Upload, Check, Eye, EyeOff, HelpCircle, ExternalLink, ChevronLeft, ChevronDown } from 'lucide-react';
import { useTranslation, languages } from '../i18n';
import { useUI } from '../ui/UIContext';
import { AppSettings } from '../types';
import { DEFAULT_CUSTOM } from '../constants';
import { isApiKeySet, getApiKey } from '../services/geminiService';
import { useCommandExecutor } from '../state/commandStore';
import { Card, Section, CompactButton, ToggleButton, FormField, Modal } from './ui';

// Presets de thèmes pour copie dans custom
const THEME_PRESETS = {
  dark: {
    primary: "#A78BFA",
    secondary: "#0B1019",
    accent: "#1D4ED8",
    background: "#0E1118",
    surface: "#151B26",
    elevated: "#1C2332",
    textPrimary: "#E5E9F2",
    textSecondary: "#A7B3C6",
    textTertiary: "#7B8499",
    border: "#242C3A",
    divider: "#1B2230",
    success: "#35C48D",
    warning: "#F0C35B",
    error: "#EE6D7A",
    info: "#6CB6FF",
    hover: "#3A4A66",
    disabled: "#3A3F4D",
  },
  cappuccino: {
    primary: "#704F34",
    secondary: "#EDE5D9",
    accent: "#C17A4F",
    background: "#FAF8F4",
    surface: "#F3EFEA",
    elevated: "#EBE5DE",
    textPrimary: "#2D1F15",
    textSecondary: "#5C4A3D",
    textTertiary: "#8B7765",
    border: "#D9CFC4",
    divider: "#E5DCC9",
    success: "#059669",
    warning: "#D97706",
    error: "#DC2626",
    info: "#0284C7",
    hover: "#E0D5C7",
    disabled: "#C4B5A0",
  },
  // Light (CLAIRE)
  'cottage-core': {
    primary: "#A5715E",
    secondary: "#F0E8DC",
    accent: "#7BAA6F",
    background: "#FAF7F2",
    surface: "#F3EEE6",
    elevated: "#ECE6DE",
    textPrimary: "#2C2A26",
    textSecondary: "#60584F",
    textTertiary: "#9A9186",
    border: "#DCD4C8",
    divider: "#E6DFD5",
    success: "#2E8B57",
    warning: "#C0853F",
    error: "#C44949",
    info: "#3F82A8",
    hover: "#E9E3DA",
    disabled: "#C8C0B6",
  },
  'quenya': {
    primary: "#7CC2A1",
    secondary: "#E7EFEB",
    accent: "#3BA38E",
    background: "#F4F8F6",
    surface: "#EEF4F1",
    elevated: "#E7EFEB",
    textPrimary: "#1F2A27",
    textSecondary: "#53645E",
    textTertiary: "#7F948D",
    border: "#D1DED8",
    divider: "#E0EBE6",
    success: "#2BAE66",
    warning: "#C9983A",
    error: "#C45E5E",
    info: "#3A86C8",
    hover: "#E6EFEA",
    disabled: "#C7D5CF",
  },
  'valinor': {
    primary: "#D9A441",
    secondary: "#F0E8D7",
    accent: "#8B6B2E",
    background: "#FCFAF3",
    surface: "#F6F0DF",
    elevated: "#EFE7CC",
    textPrimary: "#2E2818",
    textSecondary: "#6A604D",
    textTertiary: "#978C77",
    border: "#E3DAC4",
    divider: "#EEE6D3",
    success: "#3F9D6C",
    warning: "#CE8F2A",
    error: "#C7534D",
    info: "#6C8DBB",
    hover: "#F0E8D7",
    disabled: "#CEC5B1",
  },
  'magical-doremi': {
    primary: "#F49AC2",
    secondary: "#F3E5F2",
    accent: "#B78AF0",
    background: "#FFF6FB",
    surface: "#FCECF6",
    elevated: "#F5E2F0",
    textPrimary: "#3A2935",
    textSecondary: "#6F5A69",
    textTertiary: "#9B8796",
    border: "#EAD5E6",
    divider: "#F2DFED",
    success: "#48C78E",
    warning: "#F0B557",
    error: "#E6757D",
    info: "#8AB9F7",
    hover: "#F3E5F2",
    disabled: "#D7C7D4",
  },
  'crystal-clear': {
    primary: "#73B3FF",
    secondary: "#EAF3FA",
    accent: "#3FA7E0",
    background: "#F7FBFF",
    surface: "#F0F7FD",
    elevated: "#E7F2FB",
    textPrimary: "#1E2A33",
    textSecondary: "#5A6C79",
    textTertiary: "#8A9AA6",
    border: "#D5E3F0",
    divider: "#E3EEF7",
    success: "#2EA36A",
    warning: "#D2993B",
    error: "#D14646",
    info: "#3BA1D6",
    hover: "#EAF3FA",
    disabled: "#C9DAE8",
  },
  // Dark (Obscure)
  'murasaki-synthwave': {
    primary: "#BB86FC",
    secondary: "#151424",
    accent: "#00D1FF",
    background: "#0B0A12",
    surface: "#151424",
    elevated: "#1D1B2E",
    textPrimary: "#ECEAF7",
    textSecondary: "#A6A1C9",
    textTertiary: "#7E77A8",
    border: "#2A2740",
    divider: "#1E1C30",
    success: "#34D399",
    warning: "#F59E0B",
    error: "#F87171",
    info: "#60A5FA",
    hover: "#231F3A",
    disabled: "#3A3656",
  },
  'cyberpunk': {
    primary: "#FF00A8",
    secondary: "#171A21",
    accent: "#00E5FF",
    background: "#0D0F13",
    surface: "#171A21",
    elevated: "#1F232C",
    textPrimary: "#E8F1FF",
    textSecondary: "#99A4B3",
    textTertiary: "#778293",
    border: "#2A313D",
    divider: "#1B212A",
    success: "#22C55E",
    warning: "#F6AD55",
    error: "#EF4444",
    info: "#38BDF8",
    hover: "#232833",
    disabled: "#3A4350",
  },
  'fruity-loop': {
    primary: "#72E06C",
    secondary: "#1A1A1A",
    accent: "#FF7A00",
    background: "#121212",
    surface: "#1A1A1A",
    elevated: "#202020",
    textPrimary: "#EDEDED",
    textSecondary: "#A7A7A7",
    textTertiary: "#8C8C8C",
    border: "#2B2B2B",
    divider: "#1E1E1E",
    success: "#72E06C",
    warning: "#F0B429",
    error: "#E64A4A",
    info: "#5AA7FF",
    hover: "#262626",
    disabled: "#3B3B3B",
  },
  'dominate': {
    primary: "#E53935",
    secondary: "#17171B",
    accent: "#FF6F61",
    background: "#0E0E10",
    surface: "#17171B",
    elevated: "#1F2026",
    textPrimary: "#F0F2F5",
    textSecondary: "#A8ABB2",
    textTertiary: "#8D9096",
    border: "#2A2C33",
    divider: "#1B1C22",
    success: "#3CCF7A",
    warning: "#F4B23D",
    error: "#FF5A5A",
    info: "#6EB6FF",
    hover: "#23242B",
    disabled: "#3A3C43",
  },
  'expedition33': {
    primary: "#89B4D8",
    secondary: "#161C22",
    accent: "#3D8FB3",
    background: "#0F1418",
    surface: "#161C22",
    elevated: "#1D242C",
    textPrimary: "#E6EBF1",
    textSecondary: "#A7B0BB",
    textTertiary: "#8793A0",
    border: "#26303A",
    divider: "#1B252E",
    success: "#44C089",
    warning: "#D69E2E",
    error: "#E76E66",
    info: "#5DA8E3",
    hover: "#222A33",
    disabled: "#3A424C",
  },
  'duality-fee9fc-e1e1e1': {
    primary: "#B76BA3",
    secondary: "#E1E1E1",
    accent: "#7A7A7A",
    background: "#EDEDED",
    surface: "#FEE9FC",
    elevated: "#F6DFF3",
    textPrimary: "#262626",
    textSecondary: "#5E5E5E",
    textTertiary: "#8E8E8E",
    border: "#D8D8D8",
    divider: "#E6E6E6",
    success: "#2EA36A",
    warning: "#D2993B",
    error: "#D14646",
    info: "#3BA1D6",
    hover: "#F5F0F6",
    disabled: "#C9C9C9",
  },
  'rune': {
    primary: "#D4A373",
    secondary: "#1A1D1F",
    accent: "#9D6A3D",
    background: "#111314",
    surface: "#1A1D1F",
    elevated: "#202427",
    textPrimary: "#E7ECEF",
    textSecondary: "#A3ADB8",
    textTertiary: "#88929D",
    border: "#2A2F34",
    divider: "#1B2024",
    success: "#58B38C",
    warning: "#CE9B3B",
    error: "#D66B6B",
    info: "#7FA7C3",
    hover: "#24282C",
    disabled: "#3A4046",
  },
  // Colorful
  'kawaii': {
    primary: "#BFA6FF",
    secondary: "#FFEFF6",
    accent: "#FF85B3",
    background: "#FFF7FB",
    surface: "#FFEFF6",
    elevated: "#FFE6F1",
    textPrimary: "#3A2A36",
    textSecondary: "#6E586A",
    textTertiary: "#988497",
    border: "#F2D6E5",
    divider: "#F7DFEC",
    success: "#48C78E",
    warning: "#F0B557",
    error: "#E6757D",
    info: "#8AB9F7",
    hover: "#F7E8F0",
    disabled: "#DBC9D3",
  },
  'shingeki': {
    primary: "#8D5E3C",
    secondary: "#EEE6D4",
    accent: "#3A5A40",
    background: "#F5EFE2",
    surface: "#EEE6D4",
    elevated: "#E6DDC8",
    textPrimary: "#2A2A24",
    textSecondary: "#5B5B50",
    textTertiary: "#8A8A7C",
    border: "#D9CFBD",
    divider: "#E7DECC",
    success: "#2F7D4D",
    warning: "#C48A2B",
    error: "#B0473C",
    info: "#597A9B",
    hover: "#EDE3D2",
    disabled: "#C9C0AE",
  },
  'esquie': {
    primary: "#7FB3D5",
    secondary: "#ECF3F8",
    accent: "#5BC0EB",
    background: "#F3F7FA",
    surface: "#ECF3F8",
    elevated: "#E4EEF5",
    textPrimary: "#1E2730",
    textSecondary: "#566273",
    textTertiary: "#8593A3",
    border: "#D2DEE8",
    divider: "#E1EAF1",
    success: "#28A985",
    warning: "#D39A2E",
    error: "#D14F4F",
    info: "#4AA8D8",
    hover: "#E7F0F6",
    disabled: "#C6D3DF",
  },
};

interface SettingsModalProps {
  settings: AppSettings;
  updateSettings: (settings: AppSettings) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ settings, updateSettings }) => {
  const ui = useUI();
  
  if (!ui.isOpen('settings')) return null;

  const { t, i18n } = useTranslation();
  const executeCommand = useCommandExecutor();
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'THEME'>('GENERAL');
  const [apiKey, setApiKeyLocal] = useState(getApiKey());
  const [showApiKey, setShowApiKey] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<string>(settings.theme);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const hasApiKey = isApiKeySet();

  useEffect(() => {
    setCurrentTheme(settings.theme);
  }, [settings.theme]);

  const setLanguage = (lang: string) => executeCommand('setLanguage', { language: lang });

  const handleCustomUpdate = (key: keyof typeof DEFAULT_CUSTOM, val: string) => {
    executeCommand('updateCustomTheme', { colorKey: key, colorValue: val });
  };

  const setTheme = (theme: keyof typeof THEME_PRESETS | 'custom') => {
    setCurrentTheme(theme);
    setIsDropdownOpen(false);
    // Copier les couleurs du preset dans customTheme pour permettre la dérivation
    const presetColors = THEME_PRESETS[theme as keyof typeof THEME_PRESETS];
    if (presetColors) {
      executeCommand('setTheme', { theme: theme as any, customTheme: presetColors as any });
    } else {
      executeCommand('setTheme', { theme: theme as any, customTheme: settings.customTheme as any });
    }
  };

  const exportTheme = () => {
    const theme = settings.customTheme || DEFAULT_CUSTOM;
    const blob = new Blob([JSON.stringify(theme, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cs-theme-custom.json`;
    a.click();
  };

  const importTheme = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target?.result as string);
        executeCommand('setTheme', { theme: 'custom', customTheme: imported as any });
      } catch {
        alert('Invalid theme file');
      }
    };
    reader.readAsText(file);
  };

  const handleApiKeyChange = (val: string) => {
    setApiKeyLocal(val);
    executeCommand('setApiKey', { apiKey: val });
  };

  return (
    <Modal
      isOpen={ui.isOpen('settings')}
      onClose={() => ui.close('settings')}
      title={t('settings.preferences_title')}
      icon={<Palette size={20} />}
      maxWidth="max-w-lg"
    >
        {/* Tabs */}
        <div className="flex px-6 -mx-6 text-sm border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--elevated)' }}>
          <ToggleButton
            isActive={activeTab === 'GENERAL'}
            onClick={() => setActiveTab('GENERAL')}
            label={t('settings.tab_general')}
            position="first"
          />
          <ToggleButton
            isActive={activeTab === 'THEME'}
            onClick={() => setActiveTab('THEME')}
            label={t('settings.tab_visual')}
            position="last"
          />
        </div>

        {/* Content */}
        <div className="space-y-6">
          {activeTab === 'GENERAL' ? (
            <>
              {/* AI toggle */}
              <div className="flex items-center justify-between p-4 border rounded-lg" style={{ backgroundColor: 'rgb(from var(--accent) r g b / 0.1)', borderColor: 'var(--accent)' }}>
                <div>
                  <div className="flex items-center gap-2 text-sm font-bold" style={{ color: 'var(--text-primary)' }}><Cpu size={16} style={{ color: 'var(--accent)' }} /> {t('settings.cognitive_ai')}</div>
                  <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{t('settings.cognitive_ai_desc')}</p>
                </div>
                <input type="checkbox" checked={settings.enableAI} onChange={(e) => executeCommand('setAIEnabled', { aiEnabled: e.target.checked })} className="w-5 h-5 rounded" />
              </div>

              {/* API key */}
              <FormField label={t('settings.api_key')}>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => handleApiKeyChange(e.target.value)}
                    className="w-full px-3 py-2 pr-10 text-sm transition-colors border rounded outline-none focus:ring-1"
                    style={{ backgroundColor: 'var(--elevated)', borderColor: 'var(--border)', color: 'var(--text-primary)', caretColor: 'var(--accent)' }}
                    placeholder={t('settings.api_key_ph')}
                  />
                  <CompactButton
                    onClick={() => setShowApiKey(!showApiKey)}
                    variant="ghost"
                    color="var(--text-secondary)"
                    icon={showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    label=""
                    className="absolute -translate-y-1/2 right-1.5 top-1/2"
                  />
                </div>
              </FormField>

              {/* Language */}
              <div>
                <label className="block mb-3 text-xs font-bold uppercase" style={{ color: 'var(--text-tertiary)' }}>{t('settings.language_label')}</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2 rounded max-h-[200px] overflow-y-auto custom-scrollbar" style={{ backgroundColor: 'var(--elevated)' }}>
                  {languages.map(lang => (
                    <CompactButton
                      key={lang.code}
                      onClick={() => setLanguage(lang.code)}
                      variant={i18n.language === lang.code ? 'solid' : 'ghost'}
                      color="var(--accent)"
                      icon={null}
                      label={lang.label}
                      className="justify-center text-[10px]"
                    />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Theme selector dropdown */}
              <div className="relative space-y-2">
                <label className="block text-xs font-bold uppercase text-slate-500">{t('settings.theme_select') || 'Thème actif'}</label>
                
                {/* Dropdown button */}
                <div
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-stretch w-full overflow-hidden text-sm font-medium text-left transition-all rounded cursor-pointer"
                  style={{
                    border: '1px solid var(--border)'
                  }}
                >
                  <span
                    className="flex items-center flex-1 px-4 py-2"
                    style={{
                      backgroundColor: 'var(--surface)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    {currentTheme.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')}
                  </span>
                  <span
                    className="flex items-center justify-center px-3"
                    style={{
                      backgroundColor: 'var(--hover)',
                      color: 'var(--accent)'
                    }}
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </span>
                </div>

                {/* Dropdown menu */}
                {isDropdownOpen && (
                  <div
                    className="absolute left-0 right-0 z-50 mt-1 overflow-y-auto rounded shadow-lg top-full max-h-64 custom-scrollbar"
                    style={{
                      backgroundColor: 'var(--surface)',
                      border: '1px solid var(--border)'
                    }}
                  >
                    {/* Theme options */}
                    {Object.keys(THEME_PRESETS).map((theme) => (
                      <button
                        key={theme}
                        onClick={() => setTheme(theme as any)}
                        className="w-full px-4 py-2.5 text-sm text-left transition-colors flex items-center"
                        style={{
                          backgroundColor: currentTheme === theme ? 'var(--hover)' : 'transparent',
                          color: currentTheme === theme ? 'var(--text-primary)' : 'var(--text-secondary)'
                        }}
                        onMouseEnter={(e) => {
                          if (currentTheme !== theme) {
                            e.currentTarget.style.backgroundColor = 'var(--elevated)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (currentTheme !== theme) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        {currentTheme === theme && <Check size={16} className="mr-2" />}
                        <span style={{ marginLeft: currentTheme === theme ? 0 : '24px' }}>
                          {theme.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')}
                        </span>
                      </button>
                    ))}
                    {/* Custom option */}
                    <button
                      onClick={() => setTheme('custom')}
                      className="w-full px-4 py-2.5 text-sm text-left transition-colors flex items-center border-t"
                      style={{
                        backgroundColor: currentTheme === 'custom' ? 'var(--hover)' : 'transparent',
                        color: currentTheme === 'custom' ? 'var(--text-primary)' : 'var(--text-secondary)',
                        borderColor: 'var(--divider)'
                      }}
                      onMouseEnter={(e) => {
                        if (currentTheme !== 'custom') {
                          e.currentTarget.style.backgroundColor = 'var(--elevated)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (currentTheme !== 'custom') {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      {currentTheme === 'custom' && <Check size={16} className="mr-2" />}
                      <span style={{ marginLeft: currentTheme === 'custom' ? 0 : '24px' }}>
                        Custom
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* Custom theme section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold text-blue-400">
                    <Palette size={16} /> {t('settings.custom_theme') || 'Branding personnalisé'}
                  </div>
                  <div className="flex items-center gap-1">
                    <CompactButton
                      onClick={exportTheme}
                      variant="ghost"
                      color="var(--text-secondary)"
                      icon={<Download size={14} />}
                      label=""
                      className="p-1.5"
                    />
                    <label className="cursor-pointer">
                      <CompactButton
                        onClick={() => {}}
                        variant="ghost"
                        color="var(--text-secondary)"
                        icon={<Upload size={14} />}
                        label=""
                        className="p-1.5"
                      />
                      <input
                        type="file"
                        accept=".json"
                        onChange={importTheme}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
                
                <div className="p-4 space-y-3 border rounded-lg" style={{ backgroundColor: 'rgb(from var(--background) r g b / 0.5)', borderColor: 'var(--border)' }}>
                  {[
                    { key: 'primary', label: t('settings.primary_color') || 'Couleur primaire' },
                    { key: 'secondary', label: t('settings.secondary_color') || 'Couleur secondaire' },
                    { key: 'accent', label: t('settings.accent_color') || 'Couleur d\'accent' },
                    { key: 'background', label: t('settings.background') || 'Arrière-plan principal' },
                    { key: 'surface', label: t('settings.surface') || 'Surface / Panneaux' },
                    { key: 'elevated', label: t('settings.elevated') || 'Élevé / En-têtes' },
                    { key: 'textPrimary', label: t('settings.text_primary') || 'Texte principal' },
                    { key: 'textSecondary', label: t('settings.text_secondary') || 'Texte secondaire' },
                    { key: 'textTertiary', label: t('settings.text_tertiary') || 'Texte tertiaire' },
                    { key: 'border', label: t('settings.border') || 'Bordures' },
                    { key: 'divider', label: t('settings.divider') || 'Séparateurs' },
                    { key: 'success', label: t('settings.success') || 'Succès' },
                    { key: 'warning', label: t('settings.warning') || 'Avertissement' },
                    { key: 'error', label: t('settings.error') || 'Erreur' },
                    { key: 'info', label: t('settings.info') || 'Information' },
                    { key: 'hover', label: t('settings.hover') || 'Survol' },
                    { key: 'active', label: t('settings.active') || 'Actif' },
                    { key: 'disabled', label: t('settings.disabled') || 'Désactivé' }
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between gap-4">
                      <label className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>{label}</label>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono min-w-[60px] text-right" style={{ color: 'var(--text-tertiary)' }}>
                          {settings.customTheme?.[key as keyof typeof DEFAULT_CUSTOM] || DEFAULT_CUSTOM[key as keyof typeof DEFAULT_CUSTOM]}
                        </span>
                        <div className="relative w-10 h-10 overflow-hidden transition-colors border-2 rounded hover:border-[var(--accent)]" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
                          <input
                            type="color"
                            value={settings.customTheme?.[key as keyof typeof DEFAULT_CUSTOM] || DEFAULT_CUSTOM[key as keyof typeof DEFAULT_CUSTOM]}
                            onChange={(e) => handleCustomUpdate(key as keyof typeof DEFAULT_CUSTOM, e.target.value)}
                            className="absolute border-0 outline-none cursor-pointer"
                            style={{ 
                              width: '200%', 
                              height: '200%', 
                              top: '-50%', 
                              left: '-50%',
                              padding: 0,
                              margin: 0
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {currentTheme === 'custom' && (
                  <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                    <Check size={10} /> {t('settings.active_theme') || 'Thème actif'}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
    </Modal>
  );
};

export default SettingsModal;
