import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import MenuBar from "./components/MenuBar";
import Lexicon from "./components/Lexicon";
import GrammarEditor from "./components/GrammarEditor";
import GenEvolve from "./components/GenEvolve";
import PhonologyEditor from "./components/PhonologyEditor";
import Dashboard from "./components/Dashboard";
import ConsoleView from "./components/ConsoleView";
import ScriptEditor from "./components/ScriptEditor";
import Notebook from "./components/Notebook";
import ProjectWizard from "./components/ProjectWizard";
import ConstraintsModal from "./components/ConstraintsModal";
import AboutModal from "./components/AboutModal";
import SettingsModal from "./components/SettingsModal";
import WhatsNewModal from "./components/WhatsNewModal";

import { useShortcuts } from "./hooks/useShorcuts";
import { useTheme } from "./hooks/useTheme";
import { useProject } from "./hooks/useProject";

import {
  ViewState,
  LexiconEntry,
  ProjectConstraints,
  LogEntry,
  AppSettings,
} from "./types";

import { LanguageProvider, i18n } from "./i18n";

const SETTINGS_STORAGE_KEY = "conlang_studio_settings";

const AppContent: React.FC = () => {
  /* ---------------- UI STATE ---------------- */

  const [currentView, setCurrentView] = useState<ViewState>("DASHBOARD");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isConstraintsOpen, setIsConstraintsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isWhatsNewOpen, setIsWhatsNewOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardMode, setWizardMode] = useState<"create" | "edit">("create");
  const [isScriptMode, setIsScriptMode] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [draftEntry, setDraftEntry] = useState<Partial<LexiconEntry> | null>(
    null
  );
  const [consoleHistory, setConsoleHistory] = useState<LogEntry[]>([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  /*  ---------------- ACTION CALLBACKS ---------------- */
const promptOpenProject = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
       const reader = new FileReader();
      reader.onload = (e) => {
        loadProjectData(JSON.parse(e.target?.result as string));
      };
      reader.readAsText(file);
    };
    input.click();
  };


  const menuBarActions = {
    newProject: () => {
      setWizardMode("create");
      setIsWizardOpen(true);
    },
    exportProject: () => {
      const data = getFullProjectData();
      const text = JSON.stringify(data, null, 2);
      const blob = new Blob([text], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${projectName.toLowerCase().replace(/\s/g, "-")}.json`;
      a.click();
    },
    openProject: promptOpenProject,
    openSettings: () => setIsSettingsOpen(true),
    openProjectSettings: () => {
      setWizardMode("edit");
      setIsWizardOpen(true);
    },
    openConstraints: () => setIsConstraintsOpen(true),
    openConsole: () => setIsConsoleOpen(true),
    zoomIn: () => setZoomLevel((z) => Math.min(z + 10, 150)),
    zoomOut: () => setZoomLevel((z) => Math.max(z - 10, 50)),
    toggleSidebar: () => setIsSidebarOpen((o) => !o),
    toggleScriptMode: () => setIsScriptMode((s) => !s),
    openAbout: () => setIsAboutOpen(true),
  };
  /* ---------------- PROJECT STATE (HOOK) ---------------- */

  const {
    projectName,
    setProjectName,
    projectAuthor,
    setProjectAuthor,
    projectDescription,
    setProjectDescription,
    lexicon,
    setLexicon,
    grammar,
    setGrammar,
    morphology,
    setMorphology,
    phonology,
    setPhonology,
    rules,
    setRules,
    constraints,
    setConstraints,
    scriptConfig,
    setScriptConfig,
    notebook,
    setNotebook,
    loadProjectData,
    getFullProjectData,
  } = useProject();

  /* ---------------- SETTINGS ---------------- */

  const [genWordState, setGenWordState] = useState<any>(null);

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return {
      theme: "dark",
      autoSave: true,
      showLineNumbers: true,
      enableAI: true,
      language: i18n.language,
    };
  });

  useTheme(settings.theme, settings.customTheme);

  useEffect(() => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    if (settings.language && settings.language !== i18n.language) {
      i18n.changeLanguage(settings.language);
    }
  }, [settings]);

  /* ---------------- RESPONSIVE ---------------- */

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setIsSidebarOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /* ---------------- ZOOM ---------------- */

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (e.altKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 5 : -5;
        setZoomLevel((z) => Math.min(Math.max(z + delta, 50), 150));
      }
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, []);

  /* ---------------- SHORTCUTS ---------------- */
  
  useShortcuts({
    isConsoleOpen,
    setIsConsoleOpen,
    setIsSidebarOpen,
    onNewProject: menuBarActions.newProject,
    onOpenProject: menuBarActions.openProject,
    onExportProject: menuBarActions.exportProject,
    onZoomIn: () => setZoomLevel((z) => Math.min(z + 10, 150)),
    onZoomOut: () => setZoomLevel((z) => Math.max(z - 10, 50)),
  });

  /* ---------------- WHATS NEW ---------------- */

  useEffect(() => {
    const key = "whats_new_v1.1_seen";
    if (!sessionStorage.getItem(key)) setIsWhatsNewOpen(true);
  }, []);

  const closeWhatsNew = () => {
    setIsWhatsNewOpen(false);
    sessionStorage.setItem("whats_new_v1.1_seen", "true");
  };

  /* ---------------- WIZARD ---------------- */

  const handleWizardSubmit = (data: {
    name: string;
    author: string;
    description: string;
    constraints?: Partial<ProjectConstraints>;
  }) => {
    if (wizardMode === "create") {
      setProjectName(data.name);
      setProjectAuthor(data.author);
      setProjectDescription(data.description);
      if (data.constraints)
        setConstraints((c) => ({ ...c, ...data.constraints }));
      setCurrentView("DASHBOARD");
    } else {
      setProjectName(data.name);
      setProjectAuthor(data.author);
      setProjectDescription(data.description);
      if (data.constraints)
        setConstraints((c) => ({ ...c, ...data.constraints }));
    }
    setIsWizardOpen(false);
  };

  /* ---------------- VIEW RENDER ---------------- */

  const renderView = () => {
    switch (currentView) {
      case "DASHBOARD":
        return (
          <Dashboard
            entries={lexicon}
            projectName={projectName}
            author={projectAuthor}
            description={projectDescription}
            setView={setCurrentView}
            scriptConfig={scriptConfig}
            isScriptMode={isScriptMode}
          />
        );
      case "PHONOLOGY":
        return (
          <PhonologyEditor
            data={phonology}
            setData={setPhonology}
            enableAI={settings.enableAI}
          />
        );
      case "LEXICON":
        return (
          <Lexicon
            entries={lexicon}
            setEntries={setLexicon}
            constraints={constraints}
            enableAI={settings.enableAI}
            phonology={phonology}
            genWordState={genWordState}
            setGenWordState={setGenWordState}
            draftEntry={draftEntry}
            setDraftEntry={setDraftEntry}
            scriptConfig={scriptConfig}
            isScriptMode={isScriptMode}
          />
        );
      case "GRAMMAR":
        return (
          <GrammarEditor
            grammar={grammar}
            setGrammar={setGrammar}
            morphology={morphology}
            setMorphology={setMorphology}
            showLineNumbers={settings.showLineNumbers}
            scriptConfig={scriptConfig}
            isScriptMode={isScriptMode}
          />
        );
      case "GENEVOLVE":
        return (
          <GenEvolve
            entries={lexicon}
            onUpdateEntries={setLexicon}
            rules={rules}
            setRules={setRules}
            scriptConfig={scriptConfig}
            isScriptMode={isScriptMode}
          />
        );
      case "SCRIPT":
        return (
          <ScriptEditor
            scriptConfig={scriptConfig}
            setScriptConfig={setScriptConfig}
            constraints={constraints}
          />
        );
      case "NOTEBOOK":
        return (
          <Notebook
            text={notebook}
            setText={setNotebook}
            scriptConfig={scriptConfig}
            isScriptMode={isScriptMode}
          />
        );
      default:
        return null;
    }
  };

  /* ---------------- JSX ---------------- */

  return (
    <div className="flex flex-col h-screen w-screen bg-[var(--bg-main)] text-[var(--text-1)] font-sans overflow-hidden transition-colors duration-200">
      <MenuBar
        actions={menuBarActions}
        settings={settings}
        isScriptMode={isScriptMode}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          currentView={currentView}
          setView={setCurrentView}
          isOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen((o) => !o)}
        />

        <main className="flex flex-col w-full h-full">
          <div
            className="flex-1 overflow-hidden"
            style={{ zoom: zoomLevel / 100 }}
          >
            {renderView()}
          </div>

          {isConsoleOpen && (
            <ConsoleView
              isOpen={isConsoleOpen}
              loadingAI={settings.enableAI}
              onClose={() => setIsConsoleOpen(false)}
              history={consoleHistory}
              setHistory={setConsoleHistory}
            />
          )}
        </main>
      </div>

      <footer className="h-6 bg-[var(--bg-panel)] border-t border-neutral-700 flex items-center px-4 text-xs text-[var(--text-2)] gap-4 shrink-0 z-50 relative">
        <span className="flex items-center gap-1 font-bold text-emerald-500">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          Auto-Saved
        </span>
        <span className="text-neutral-400">{projectName}</span>
        <span className="text-neutral-500/80 font-mono text-[11px]">v1.1</span>
        <span className="ml-auto">Ln 1, Col 1</span>
        <span>{lexicon.length} Words</span>
        <span>AI: {settings.enableAI ? "READY" : "OFF"}</span>
      </footer>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
      />

      <ConstraintsModal
        isOpen={isConstraintsOpen}
        onClose={() => setIsConstraintsOpen(false)}
        constraints={constraints}
        onUpdateConstraints={setConstraints}
        scriptConfig={scriptConfig}
        isScriptMode={isScriptMode}
        onUpdateScriptConfig={setScriptConfig}
      />

      <ProjectWizard
        isOpen={isWizardOpen}
        mode={wizardMode}
        initialData={{
          name: wizardMode === "create" ? "" : projectName,
          author: wizardMode === "create" ? "" : projectAuthor,
          description: wizardMode === "create" ? "" : projectDescription,
        }}
        onClose={() => setIsWizardOpen(false)}
        onSubmit={handleWizardSubmit}
      />

      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
      <WhatsNewModal isOpen={isWhatsNewOpen} onClose={closeWhatsNew} />
    </div>
  );
};

const App: React.FC = () => (
  <LanguageProvider i18n={i18n}>
    <AppContent />
  </LanguageProvider>
);

export default App;
