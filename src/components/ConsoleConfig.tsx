import { Info, Zap } from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import { LogEntry, ViewState } from "../types";
import { useTranslation } from "../i18n";
import { useCommandExecutor, resolveModal } from "../state/commandStore";

const TERMINAL_HEADER = `
██╗  ██╗ ██████╗ ██████╗ ███████╗██╗      █████╗ ███╗   ██╗ ██████╗ 
██║ ██╔╝██╔═══██╗██╔══██╗██╔════╝██║     ██╔══██╗████╗  ██║██╔════╝ 
█████╔╝ ██║   ██║██████╔╝█████╗  ██║     ███████║██╔██╗ ██║██║  ███╗
██╔═██╗ ██║   ██║██╔══██╗██╔══╝  ██║     ██╔══██║██║╚██╗██║██║   ██║
██║  ██╗╚██████╔╝██║  ██║███████╗███████╗██║  ██║██║ ╚████║╚██████╔╝
╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝ 
`;

interface ConsoleConfigProps {
  loadingAI: boolean;
  author?: string;
  currentView?: ViewState;
}

const ConsoleConfig: React.FC<ConsoleConfigProps> = ({ loadingAI, author = "user", currentView }) => {
  const { t } = useTranslation();
  const [history, setHistory] = useState<LogEntry[]>([]);
  const [input, setInput] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyCursor, setHistoryCursor] = useState<number>(0);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const executeCommand = useCommandExecutor();

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Root commands (no category prefix)
  const ROOT_COMMANDS = [
    { cmd: "cd", args: "<section>", desc: "Navigate to a section", options: ["dashboard", "lexicon", "phonology", "grammar", "morphology", "genevolve", "genword", "script", "notebook", "console"] },
    { cmd: "help", args: "[-cat <category>]", desc: "Show help", options: ["project", "lexicon", "sb", "console"] },
    { cmd: "clear", args: "", desc: "Clear the terminal" },
    { cmd: "cls", args: "", desc: "Alias for CLEAR" },
    { cmd: "about", args: "", desc: "About this console" },
  ];

  // Categories with subcommands (category --command format)
  const COMMAND_CATEGORIES = {
    project: {
      name: "Project Management",
      commands: [
        { cmd: "--new", args: "[-n <name>] [-user <author>] [-desc <description>]", desc: "Create a new project" },
        { cmd: "--open", args: "[-path <file_path>]", desc: "Open an existing project" },
        { cmd: "--export", args: "", desc: "Export current project" },
      ]
    },
    lexicon: {
      name: "Lexicon",
      commands: [
        { cmd: "--add", args: "-w <word> -p <pos> -d <def> [-ipa <ipa>] [-ety <etym>] [-drv <derived>]", desc: "Add lexicon entry" },
        { cmd: "--list", args: "", desc: "View lexicon" },
        { cmd: "--delete", args: "-w <word>", desc: "Delete an entry" },
        { cmd: "--search", args: "-q <term>", desc: "Search lexicon" },
      ]
    },
    sb: {
      name: "Sidebar Control",
      commands: [
        { cmd: "--t", args: "", desc: "Toggle sidebar" },
        { cmd: "--o", args: "", desc: "Open sidebar" },
        { cmd: "--c", args: "", desc: "Close sidebar" },
      ]
    },
    console: {
      name: "Console Control",
      commands: [
        { cmd: "--open", args: "", desc: "Open console pane" },
        { cmd: "--close", args: "", desc: "Close console pane" },
        { cmd: "--max", args: "", desc: "Maximize console" },
        { cmd: "--min", args: "", desc: "Minimize console" },
      ]
    },
  };

  // All categories for suggestions
  const CATEGORY_NAMES = Object.keys(COMMAND_CATEGORIES);
  const ROOT_COMMAND_NAMES = ROOT_COMMANDS.map(c => c.cmd);

  // Compute single inline suggestion (next completion to add)
  const computeInlineSuggestion = (raw: string): string => {
    if (!raw.trim()) return ""; // No suggestion if empty
    
    const trimmed = raw.trim();
    const tokens = trimmed.split(/\s+/);
    const first = tokens[0].toLowerCase();
    const last = tokens[tokens.length - 1];

    // First token: suggest first matching command/category
    if (tokens.length === 1) {
      const all = [...ROOT_COMMAND_NAMES, ...CATEGORY_NAMES];
      const matches = all.filter(c => c.toLowerCase().startsWith(first));
      if (matches.length > 0) {
        return matches[0]; // Return full word
      }
      return "";
    }

    // Root command: cd
    if (first === "cd") {
      const sections = ["dashboard", "lexicon", "phonology", "grammar", "morphology", "genevolve", "genword", "script", "notebook", "console"];
      const part = tokens[1] || "";
      const matches = sections.filter(s => s.startsWith(part.toLowerCase()));
      if (matches.length > 0) {
        return matches[0];
      }
      return "";
    }

    // Root command: help
    if (first === "help") {
      if (tokens.length === 2 && last === "-cat") {
        if (CATEGORY_NAMES.length > 0) {
          return CATEGORY_NAMES[0];
        }
      }
      if (tokens.length === 3 && tokens[1] === "-cat") {
        const part = tokens[2] || "";
        const matches = CATEGORY_NAMES.filter(c => c.startsWith(part.toLowerCase()));
        if (matches.length > 0) {
          return matches[0];
        }
      }
      if (tokens.length === 2 && !last.includes("-")) {
        return "-cat";
      }
      return "";
    }

    // Category-based commands
    const category = COMMAND_CATEGORIES[first as keyof typeof COMMAND_CATEGORIES];
    if (category) {
      const second = tokens[1]?.toLowerCase();
      
      // Suggest first matching subcommand
      if (tokens.length === 2) {
        const matches = category.commands.filter(c => c.cmd.startsWith(second || ""));
        if (matches.length > 0) {
          return matches[0].cmd;
        }
        return "";
      }

      // Suggest arguments for specific subcommands
      const subCmd = category.commands.find(c => c.cmd.toLowerCase() === second);
      if (subCmd) {
        if (first === "lexicon" && second === "--add") {
          const presentFlags = new Set(tokens.filter(t => t.startsWith("-") && !t.startsWith("--")).map(t => t.split(" ")[0]));
          const params = ["-w", "-p", "-d", "-ipa", "-ety", "-drv"]
            .filter(p => !presentFlags.has(p));
          if (last.startsWith("-")) {
            const matches = params.filter(p => p.startsWith(last));
            return matches.length > 0 ? matches[0] : "";
          }
          return params.length > 0 ? params[0] : "";
        }
        if (first === "lexicon" && second === "--delete") {
          if (last.startsWith("-")) {
            return "-w".startsWith(last) ? "-w" : "";
          }
          return "-w";
        }
        if (first === "lexicon" && second === "--search") {
          if (last.startsWith("-")) {
            return "-q".startsWith(last) ? "-q" : "";
          }
          return "-q";
        }
        if (first === "project" && second === "--new") {
          const presentFlags = new Set(tokens.filter(t => t.startsWith("-") && !t.startsWith("--")).map(t => t.split(" ")[0]));
          const params = ["-n", "-user", "-desc"]
            .filter(p => !presentFlags.has(p));
          if (last.startsWith("-")) {
            const matches = params.filter(p => p.startsWith(last));
            return matches.length > 0 ? matches[0] : "";
          }
          return params.length > 0 ? params[0] : "";
        }
        if (first === "project" && second === "--open") {
          if (last.startsWith("-")) {
            return "-path".startsWith(last) ? "-path" : "";
          }
          return "-path";
        }
      }
    }

    return "";
  };

  // Get inline suggestion
  const inlineSuggestion = computeInlineSuggestion(input);

  // Scroll automatique vers le bas
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    inputRef.current?.focus();
  }, [history]);

  const addLog = (type: LogEntry["type"], content: string, component?: React.ReactNode) => {
    const timestamp = new Date().toLocaleTimeString();
    setHistory(prev => [...prev, { type, content, timestamp, component }]);
  };

  const clearTerminal = () => {
    setHistory([{ type: "info", content: TERMINAL_HEADER, timestamp: "" }]);
  };

  // Initial mount: restore from sessionStorage if available; otherwise initialize header
  useEffect(() => {
    try {
      const savedHistory = sessionStorage.getItem("korelang.console.history");
      const savedInput = sessionStorage.getItem("korelang.console.input");
      const savedCmdHistory = sessionStorage.getItem("korelang.console.cmdHistory");
      if (savedHistory) {
        const parsed: Array<Pick<LogEntry, "type" | "content" | "timestamp">> = JSON.parse(savedHistory);
        setHistory(parsed as LogEntry[]);
      } else {
        clearTerminal();
      }
      if (savedInput) setInput(savedInput);
      if (savedCmdHistory) {
        const cmds: string[] = JSON.parse(savedCmdHistory);
        setCommandHistory(cmds);
        setHistoryCursor(cmds.length);
      }
    } catch {
      clearTerminal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist history (without React components) and input into sessionStorage
  useEffect(() => {
    try {
      const serializable = history.map(h => ({ type: h.type, content: h.content, timestamp: h.timestamp }));
      sessionStorage.setItem("korelang.console.history", JSON.stringify(serializable));
    } catch {}
  }, [history]);

  useEffect(() => {
    try {
      sessionStorage.setItem("korelang.console.input", input);
    } catch {}
  }, [input]);

  useEffect(() => {
    try {
      sessionStorage.setItem("korelang.console.cmdHistory", JSON.stringify(commandHistory));
    } catch {}
  }, [commandHistory]);

  const handleCommand = (cmdStr: string) => {
    if (!cmdStr.trim()) return;
    // Track command history for ArrowUp/ArrowDown navigation
    setCommandHistory(prev => [...prev, cmdStr]);
    setHistoryCursor(prev => prev + 1);
    addLog("command", cmdStr);

    const [rawCommand, ...args] = cmdStr.trim().split(/\s+/);
    const cmd = rawCommand.toLowerCase();

    // Root commands
    if (cmd === "clear" || cmd === "cls") {
      clearTerminal();
      return;
    }

    if (cmd === "about") {
      addLog("output", "KoreLang Console v1.2 - Standardized command shell.");
      return;
    }

    if (cmd === "help") {
      const categoryArg = args.findIndex(arg => arg === "-cat");
      const category = categoryArg !== -1 ? args[categoryArg + 1]?.toLowerCase() : null;
      
      if (category && COMMAND_CATEGORIES[category as keyof typeof COMMAND_CATEGORIES]) {
        const cat = COMMAND_CATEGORIES[category as keyof typeof COMMAND_CATEGORIES];
        addLog("output", "");
        addLog("output", `[${category.toUpperCase()}]`, (
          <span style={{ color: 'var(--primary)' }}>
            [{category.toUpperCase()}]
          </span>
        ));
        cat.commands.forEach(c => {
          addLog("output", `  ${category} ${c.cmd} ${c.args}`, (
            <span>
              <span style={{ color: 'var(--primary)' }}>{category}</span>
              <span style={{ color: 'var(--warning)' }}> {c.cmd}</span>
              <span style={{ color: 'var(--info)' }}> {c.args}</span>
            </span>
          ));
          addLog("info", `    ${c.desc}`);
        });
        addLog("output", "");
      } else if (category) {
        addLog("error", `Unknown category: ${category}`);
        addLog("info", `Available categories: ${Object.keys(COMMAND_CATEGORIES).join(', ')}`);
      } else {
        // Display only root commands
        addLog("output", "");
        addLog("output", "KORELANG CONSOLE - ROOT COMMANDS", (
          <span style={{ color: 'var(--primary)' }}>
            KORELANG CONSOLE - ROOT COMMANDS
          </span>
        ));
        addLog("output", "");
        ROOT_COMMANDS.forEach(c => {
          addLog("output", `  ${c.cmd} ${c.args}`, (
            <span>
              <span style={{ color: 'var(--warning)' }}>{c.cmd}</span>
              <span style={{ color: 'var(--info)' }}> {c.args}</span>
            </span>
          ));
          addLog("info", `    ${c.desc}`);
        });
        addLog("output", "");
        addLog("info", `Type 'help -cat <category>' to see available categories:`);
        addLog("info", `Available: ${CATEGORY_NAMES.map(c => `${c}`).join(', ')}`);
        addLog("output", "");
      }
      return;
    }

    if (cmd === "cd") {
      const section = args[0]?.toLowerCase();
      const validSections = ["dashboard", "lexicon", "phonology", "grammar", "morphology", "genevolve", "genword", "script", "notebook", "console"];
      
      // Map user input to ViewState
      const viewMap: Record<string, string> = {
        "dashboard": "DASHBOARD",
        "lexicon": "LEXICON",
        "phonology": "PHONOLOGY",
        "grammar": "GRAMMAR",
        "morphology": "GRAMMAR",  // morphology is part of grammar view
        "genevolve": "GENEVOLVE",
        "genword": "GENEVOLVE",   // genword is part of genevolve view
        "script": "SCRIPT",
        "notebook": "NOTEBOOK",
        "console": "CONSOLE"
      };

      if (!section) {
        addLog("error", "Specify section to navigate to.");
        addLog("info", `Available sections: ${validSections.join(', ')}`);
        return;
      }

      if (!validSections.includes(section)) {
        addLog("error", `${section} not found`);
        addLog("info", `Available sections: ${validSections.join(', ')}`);
        return;
      }

      // Get the view to navigate to
      const targetView = viewMap[section];

      // Check if already on this view
      if (currentView === targetView) {
        addLog("warning", `Already on ${section}`);
        return;
      }

      executeCommand("navigateTo", { view: targetView });
      addLog("success", `Navigated to: ${section}`);
      return;
    }

    // Category-based commands
    const category = COMMAND_CATEGORIES[cmd as keyof typeof COMMAND_CATEGORIES];
    if (category) {
      const subCmd = args[0]?.toLowerCase();
      if (!subCmd) {
        addLog("error", `Specify subcommand for ${cmd}.`);
        addLog("info", `Available: ${category.commands.map(c => c.cmd).join(', ')}`);
        return;
      }

      const commandDef = category.commands.find(c => c.cmd.toLowerCase() === subCmd);
      if (!commandDef) {
        addLog("error", `Unknown ${cmd} subcommand: ${subCmd}`);
        addLog("info", `Available: ${category.commands.map(c => c.cmd).join(', ')}`);
        return;
      }

      // Parse flags/parameters
      const params: Record<string, string> = {};
      for (let i = 1; i < args.length; i++) {
        const a = args[i];
        if (a.startsWith("-") && !a.startsWith("--")) {
          const key = a.toLowerCase();
          const val = args[i + 1];
          if (val && !val.startsWith("-")) {
            params[key] = val;
            i++;
          }
        }
      }

      // Execute category-specific commands
      if (cmd === "project") {
        if (subCmd === "--new") {
          const name = params["-n"] || "Untitled Project";
          const author = params["-user"] || "Anonymous";
          const description = params["-desc"] || "";
          
          executeCommand("newProject", { name, author, description });
          addLog("success", `Creating project: "${name}"`);
          addLog("info", `Author: ${author}`);
          if (description) addLog("info", `Description: ${description}`);
        } else if (subCmd === "--open") {
          const path = params["-path"];
          if (!path) {
            addLog("error", "Missing required flag: -path <file_path>");
            addLog("info", "Usage: project --open -path <file_path>");
            return;
          }
          
          // Attempt to load file from path
          fetch(path)
            .then(response => {
              if (!response.ok) {
                throw new Error(`File not found: ${path}`);
              }
              return response.json();
            })
            .then(data => {
              executeCommand("loadProject", { data });
              addLog("success", `Project loaded from: ${path}`);
            })
            .catch(error => {
              addLog("error", `Failed to load project: ${error.message}`);
            });
        } else if (subCmd === "--export") {
          executeCommand("exportProject");
          addLog("success", "Exporting current project...");
        }
      } else if (cmd === "lexicon") {
        if (subCmd === "--add") {
          const requiredFlags = ["-w", "-p", "-d"];
          const missing = requiredFlags.filter(f => !params[f]);
          if (missing.length > 0) {
            addLog("error", `Missing required flags: ${missing.join(', ')}`);
            addLog("info", "Required: -w <word> -p <pos> -d <def>");
            return;
          }
          const newEntry = {
            word: params["-w"],
            pos: params["-p"],
            definition: params["-d"],
            ipa: params["-ipa"] || '',
            etymology: params["-ety"] || '',
            derivedFrom: params["-drv"] || '',
            timestamp: Date.now()
          };
          executeCommand("addLexiconEntry", newEntry);
          addLog("success", `Entry added: "${newEntry.word}" (${newEntry.pos})`);
          addLog("info", `Definition: ${newEntry.definition}`);
        } else if (subCmd === "--list") {
          executeCommand("navigateTo", { view: "lexicon" });
          addLog("success", "Navigated to Lexicon view.");
        } else if (subCmd === "--delete") {
          const word = params["-w"];
          if (!word) {
            addLog("error", "Specify word: lexicon --delete -w <word>");
            return;
          }
          executeCommand("deleteLexiconEntry", { word });
          addLog("success", `Deletion request for: "${word}"`);
        } else if (subCmd === "--search") {
          const query = params["-q"];
          if (!query) {
            addLog("error", "Specify term: lexicon --search -q <term>");
            return;
          }
          executeCommand("searchLexicon", { query });
          addLog("success", `Searching for: "${query}"`);
        }
      } else if (cmd === "sb") {
        if (subCmd === "--t") {
          executeCommand("toggleSidebar");
          addLog("success", "Sidebar toggled.");
        } else if (subCmd === "--o") {
          executeCommand("openSidebar");
          addLog("success", "Sidebar opened.");
        } else if (subCmd === "--c") {
          executeCommand("closeSidebar");
          addLog("success", "Sidebar closed.");
        }
      } else if (cmd === "console") {
        if (subCmd === "--open") {
          executeCommand("openConsole");
          addLog("success", "Console opened.");
        } else if (subCmd === "--close") {
          executeCommand("closeConsole");
          addLog("success", "Console closed.");
        } else if (subCmd === "--max") {
          executeCommand("maximizeConsole");
          addLog("success", "Console maximized.");
        } else if (subCmd === "--min") {
          executeCommand("minimizeConsole");
          addLog("success", "Console minimized.");
        }
      }
      return;
    }

    // Unknown command
    addLog("error", `Command not recognized: ${cmdStr}`);
    addLog("info", "Type 'help' to see available commands.");
  };

  return (
    <div className="h-full flex flex-col bg-[var(--inputfield)] font-mono text-sm relative">
      {/* Header */}
      <div className="p-2 border-b border-white/5 bg-[var(--inputfield)] flex justify-between items-center text-xs text-[var(--text-2)]">
        <span className="flex items-center gap-2">
          <Info size={10} /> KoreLang kernel_v1.1
        </span>
        <span className="flex items-center gap-2 text-emerald-500">
          {loadingAI && <Zap size={12} style={{ color: 'var(--accent)' }} className="animate-pulse" />}
          SYSTEM_READY
        </span>
      </div>

      {/* Terminal history */}
      <div className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar" onClick={() => inputRef.current?.focus()}>
        {history.map((log, i) => (
          <div
            key={i}
            className={`flex flex-col ${
              log.type === "error"
                ? "text-red-500"
                : log.type === "warning"
                ? "text-[var(--warning)]"
                : log.type === "success"
                ? "text-emerald-400"
                : log.type === "command"
                ? "text-[var(--text-1)] font-bold"
                : "text-[var(--text-2)]"
            }`}
          >
            <div className="flex gap-3 leading-relaxed">
              {log.type === "command" && <span className="text-emerald-500">KoreLang-@{author}:~$</span>}
              <span className={log.content === TERMINAL_HEADER ? "whitespace-pre text-blue-400 font-bold leading-none" : ""}>
                {(() => {
                  const cats = ['lexicon', 'project', 'sb', 'console'];
                  const firstWord = log.content.split(' ')[0].toLowerCase();
                  if (cats.includes(firstWord)) {
                    return (
                      <>
                        <span style={{ color: 'var(--primary)' }}>{firstWord}</span>
                        {log.content.slice(firstWord.length)}
                      </>
                    );
                  }
                  return log.content;
                })()}
              </span>
            </div>
            {log.component && <div className="mt-2 mb-4">{log.component}</div>}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input avec suggestion inline */}
      <div className="p-2 bg-[var(--inputfield)] border-t border-white/5 flex items-center relative">
        <span className="font-bold text-emerald-500">KoreLang-@{author}:~$</span>
        <div className="relative flex-1 ml-2">
          {/* Input réel */}
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setHistoryCursor(commandHistory.length);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleCommand(input);
                setInput("");
                setSuggestions([]);
                setHistoryCursor(commandHistory.length + 1);
              } else if (e.key === "Tab" && inlineSuggestion) {
                e.preventDefault();
                // Complete only the missing part
                const trimmed = input.trim();
                const tokens = trimmed.split(/\s+/);
                const last = tokens[tokens.length - 1];
                
                // Find how much of the suggestion is already typed
                const suggestion = inlineSuggestion;
                const alreadyTyped = last ? suggestion.substring(0, last.length) : "";
                const toAdd = suggestion.substring(alreadyTyped.length);
                
                if (toAdd) {
                  setInput(input + toAdd);
                } else {
                  // If it's a full word match, add a space
                  if (suggestion && !input.endsWith(" ")) {
                    setInput(input + " ");
                  }
                }
              } else if (e.key === "ArrowLeft" && e.ctrlKey) {
                // Reserved for future navigation
              } else if (e.key === "ArrowRight" && e.ctrlKey) {
                // Reserved for future navigation
              } else if (e.key === "ArrowUp") {
                // Navigate command history backwards
                e.preventDefault();
                if (commandHistory.length === 0) return;
                const nextCursor = Math.max(0, historyCursor - 1);
                setHistoryCursor(nextCursor);
                setInput(commandHistory[nextCursor] ?? "");
              } else if (e.key === "ArrowDown") {
                // Navigate command history forwards
                e.preventDefault();
                if (commandHistory.length === 0) return;
                const nextCursor = Math.min(commandHistory.length, historyCursor + 1);
                setHistoryCursor(nextCursor);
                if (nextCursor === commandHistory.length) {
                  setInput("");
                } else {
                  setInput(commandHistory[nextCursor] ?? "");
                }
              }
            }}
            className="bg-transparent border-none outline-none text-[var(--text-1)] w-full relative z-10"
            placeholder={t("console.placeholder") || "Enter command..."}
            autoComplete="off"
            style={{ 
              backgroundColor: "transparent",
              position: "relative",
            }}
          />
          
          {/* Suggestion affichée en transparent derrière le curseur */}
          {inlineSuggestion && input.trim() && (
            <div
              className="absolute top-0 left-0 text-[var(--text-3)] pointer-events-none font-mono text-sm"
              style={{
                opacity: 0.4,
                overflow: "hidden",
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ visibility: "hidden" }}>{input}</span>
              <span>{inlineSuggestion.substring(input.trim().split(/\s+/).pop()?.length || 0)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConsoleConfig;
