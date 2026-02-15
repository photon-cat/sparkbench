"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import styles from "./EditorPanel.module.css";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MonacoEditor = dynamic(() => import("@monaco-editor/react") as any, {
  ssr: false,
  loading: () => (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#666",
      }}
    >
      Loading editor...
    </div>
  ),
}) as any;

// Arduino functions and constants for syntax highlighting
const ARDUINO_FUNCTIONS = [
  "pinMode", "digitalWrite", "digitalRead", "analogRead", "analogWrite",
  "delay", "delayMicroseconds", "millis", "micros",
  "Serial", "Wire", "SPI", "tone", "noTone",
  "attachInterrupt", "detachInterrupt", "interrupts", "noInterrupts",
  "map", "constrain", "min", "max", "abs", "pow", "sqrt", "sq",
  "sin", "cos", "tan", "randomSeed", "random",
  "bitRead", "bitWrite", "bitSet", "bitClear", "bit",
  "lowByte", "highByte", "shiftOut", "shiftIn", "pulseIn",
  "setup", "loop",
  // SSD1306 / display
  "begin", "clearDisplay", "display", "setCursor", "setTextSize",
  "setTextColor", "println", "print", "write", "drawPixel",
  "fillScreen", "drawLine", "drawRect", "fillRect",
  "drawCircle", "fillCircle", "drawBitmap",
];

const ARDUINO_CONSTANTS = [
  "HIGH", "LOW", "INPUT", "OUTPUT", "INPUT_PULLUP",
  "LED_BUILTIN", "LED_BUILTIN_TX", "LED_BUILTIN_RX",
  "A0", "A1", "A2", "A3", "A4", "A5", "A6", "A7",
  "SS", "MOSI", "MISO", "SCK", "SDA", "SCL",
  "SERIAL", "DISPLAY", "LSBFIRST", "MSBFIRST",
  "CHANGE", "FALLING", "RISING",
  "WHITE", "BLACK", "SSD1306_WHITE", "SSD1306_BLACK",
  "SSD1306_SWITCHCAPVCC", "SCREEN_WIDTH", "SCREEN_HEIGHT",
  "OLED_RESET",
  "true", "false", "NULL", "nullptr",
];

const ARDUINO_TYPES = [
  "boolean", "byte", "char", "double", "float", "int", "long",
  "short", "size_t", "string", "String", "word",
  "uint8_t", "uint16_t", "uint32_t", "int8_t", "int16_t", "int32_t",
  "unsigned", "signed", "volatile", "const", "static", "extern",
  "Adafruit_SSD1306",
];

let arduinoThemeRegistered = false;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function registerArduinoTheme(monaco: any) {
  if (arduinoThemeRegistered) return;
  arduinoThemeRegistered = true;

  // Register the Arduino language as an extension of cpp
  monaco.languages.register({ id: "arduino" });
  monaco.languages.setMonarchTokensProvider("arduino", {
    defaultToken: "",
    brackets: [
      { open: "{", close: "}", token: "delimiter.curly" },
      { open: "[", close: "]", token: "delimiter.square" },
      { open: "(", close: ")", token: "delimiter.parenthesis" },
    ],
    keywords: [
      "void", "if", "else", "for", "while", "do", "switch", "case",
      "default", "break", "continue", "return", "goto", "struct",
      "class", "enum", "typedef", "sizeof", "new", "delete",
      "#include", "#define", "#ifdef", "#ifndef", "#endif", "#else",
      "#elif", "#pragma", "#if",
    ],
    arduinoFunctions: ARDUINO_FUNCTIONS,
    arduinoConstants: ARDUINO_CONSTANTS,
    arduinoTypes: ARDUINO_TYPES,
    operators: [
      "=", ">", "<", "!", "~", "?", ":",
      "==", "<=", ">=", "!=", "&&", "||", "++", "--",
      "+", "-", "*", "/", "&", "|", "^", "%", "<<", ">>",
      "+=", "-=", "*=", "/=", "&=", "|=", "^=", "%=", "<<=", ">>=",
    ],
    symbols: /[=><!~?:&|+\-*/^%]+/,
    escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
    tokenizer: {
      root: [
        // Preprocessor directives
        [/#\s*\w+/, "keyword.directive"],
        // Identifiers and keywords
        [/[a-zA-Z_]\w*/, {
          cases: {
            "@keywords": "keyword",
            "@arduinoTypes": "type",
            "@arduinoFunctions": "arduino.function",
            "@arduinoConstants": "arduino.constant",
            "@default": "identifier",
          },
        }],
        // Whitespace
        { include: "@whitespace" },
        // Delimiters and operators
        [/[{}()[\]]/, "@brackets"],
        [/@symbols/, {
          cases: {
            "@operators": "operator",
            "@default": "",
          },
        }],
        // Numbers
        [/0[xX][0-9a-fA-F]+/, "number.hex"],
        [/0[bB][01]+/, "number.binary"],
        [/\d*\.\d+([eE][-+]?\d+)?[fFlL]?/, "number.float"],
        [/\d+[eE][-+]?\d+[fFlL]?/, "number.float"],
        [/\d+[fFlLuU]*/, "number"],
        // Strings
        [/"([^"\\]|\\.)*$/, "string.invalid"],
        [/"/, "string", "@string"],
        // Characters
        [/'[^\\']'/, "string.char"],
        [/(')(@escapes)(')/, ["string.char", "string.escape", "string.char"]],
        [/'/, "string.invalid"],
        // Semicolons
        [/;/, "delimiter"],
        // Commas
        [/,/, "delimiter"],
      ],
      whitespace: [
        [/[ \t\r\n]+/, "white"],
        [/\/\*/, "comment", "@comment"],
        [/\/\/.*$/, "comment"],
      ],
      comment: [
        [/[^/*]+/, "comment"],
        [/\*\//, "comment", "@pop"],
        [/[/*]/, "comment"],
      ],
      string: [
        [/[^\\"]+/, "string"],
        [/@escapes/, "string.escape"],
        [/\\./, "string.escape.invalid"],
        [/"/, "string", "@pop"],
      ],
    },
  });

  // Define the Arduino-inspired dark theme
  monaco.editor.defineTheme("arduino-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "keyword", foreground: "CC7832" },          // orange-ish for keywords
      { token: "keyword.directive", foreground: "9876AA" }, // purple for #include etc
      { token: "type", foreground: "CC7832" },              // orange for types like void
      { token: "arduino.function", foreground: "D4503C" },  // red for Arduino functions
      { token: "arduino.constant", foreground: "2DBDA8" },  // teal for constants
      { token: "number", foreground: "6897BB" },            // blue for numbers
      { token: "number.hex", foreground: "6897BB" },
      { token: "number.float", foreground: "6897BB" },
      { token: "number.binary", foreground: "6897BB" },
      { token: "string", foreground: "6A8759" },            // green for strings
      { token: "string.char", foreground: "6A8759" },
      { token: "string.escape", foreground: "CC7832" },
      { token: "comment", foreground: "808080" },           // gray for comments
      { token: "operator", foreground: "A9B7C6" },
      { token: "delimiter", foreground: "A9B7C6" },
      { token: "identifier", foreground: "A9B7C6" },        // default text
    ],
    colors: {
      "editor.background": "#1e1e1e",
    },
  });
}

interface ProjectFile {
  name: string;
  content: string;
}

interface EditorPanelProps {
  sketchCode: string;
  diagramJson: string;
  pcbText: string | null;
  projectFiles: ProjectFile[];
  onSketchChange: (code: string) => void;
  onDiagramChange: (json: string) => void;
  onPcbChange: (text: string) => void;
  onAddFile: (name: string) => void;
  onDeleteFile: (name: string) => void;
  onRenameFile: (oldName: string, newName: string) => void;
  onFileContentChange: (name: string, content: string) => void;
}

export default function EditorPanel({
  sketchCode,
  diagramJson,
  pcbText,
  projectFiles,
  onSketchChange,
  onDiagramChange,
  onPcbChange,
  onAddFile,
  onDeleteFile,
  onRenameFile,
  onFileContentChange,
}: EditorPanelProps) {
  const [activeTab, setActiveTab] = useState("sketch");
  const [renamingFile, setRenamingFile] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);
  const monacoReady = useRef(false);

  // Focus rename input when it appears
  useEffect(() => {
    if (renamingFile && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingFile]);

  // If active tab references a deleted file, fall back to sketch
  useEffect(() => {
    if (activeTab.startsWith("file:")) {
      const fileName = activeTab.slice(5);
      if (!projectFiles.find((f) => f.name === fileName)) {
        setActiveTab("sketch");
      }
    }
  }, [activeTab, projectFiles]);

  const handleDoubleClick = useCallback((fileName: string) => {
    setRenamingFile(fileName);
    setRenameValue(fileName);
  }, []);

  const commitRename = useCallback(() => {
    if (!renamingFile) return;
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== renamingFile) {
      // Check for duplicate names
      const exists = projectFiles.some((f) => f.name === trimmed);
      if (!exists) {
        onRenameFile(renamingFile, trimmed);
        if (activeTab === `file:${renamingFile}`) {
          setActiveTab(`file:${trimmed}`);
        }
      }
    }
    setRenamingFile(null);
  }, [renamingFile, renameValue, projectFiles, onRenameFile, activeTab]);

  const handleRenameKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      commitRename();
    } else if (e.key === "Escape") {
      setRenamingFile(null);
    }
  }, [commitRename]);

  const handleAddFile = useCallback(() => {
    let name = "new_file.h";
    let n = 1;
    while (projectFiles.some((f) => f.name === name)) {
      n++;
      name = `new_file_${n}.h`;
    }
    onAddFile(name);
    setActiveTab(`file:${name}`);
    // Auto-enter rename mode
    setTimeout(() => {
      setRenamingFile(name);
      setRenameValue(name);
    }, 0);
  }, [projectFiles, onAddFile]);

  const handleDeleteFile = useCallback((fileName: string) => {
    setRenamingFile(null);
    onDeleteFile(fileName);
  }, [onDeleteFile]);

  const getLanguageForFile = (name: string): string => {
    if (name.endsWith(".ino") || name.endsWith(".cpp") || name.endsWith(".c") || name.endsWith(".h")) return "arduino";
    if (name.endsWith(".json")) return "json";
    return "plaintext";
  };

  const getThemeForFile = (name: string): string => {
    if (name.endsWith(".ino") || name.endsWith(".cpp") || name.endsWith(".c") || name.endsWith(".h")) return "arduino-dark";
    return "vs-dark";
  };

  const currentValue = (() => {
    if (activeTab === "sketch") return sketchCode;
    if (activeTab === "diagram") return diagramJson;
    if (activeTab === "pcb") return pcbText ?? "";
    if (activeTab === "libraries") return "";
    if (activeTab.startsWith("file:")) {
      const fileName = activeTab.slice(5);
      const file = projectFiles.find((f) => f.name === fileName);
      return file?.content ?? "";
    }
    return "";
  })();

  const currentLanguage = (() => {
    if (activeTab === "sketch") return "arduino";
    if (activeTab === "diagram") return "json";
    if (activeTab.startsWith("file:")) return getLanguageForFile(activeTab.slice(5));
    return "plaintext";
  })();

  const currentTheme = (() => {
    if (activeTab === "sketch") return "arduino-dark";
    if (activeTab.startsWith("file:")) return getThemeForFile(activeTab.slice(5));
    return "vs-dark";
  })();

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      if (value === undefined) return;
      if (activeTab === "sketch") {
        onSketchChange(value);
      } else if (activeTab === "diagram") {
        onDiagramChange(value);
      } else if (activeTab === "pcb") {
        onPcbChange(value);
      } else if (activeTab.startsWith("file:")) {
        const fileName = activeTab.slice(5);
        onFileContentChange(fileName, value);
      }
    },
    [activeTab, onSketchChange, onDiagramChange, onPcbChange, onFileContentChange],
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleBeforeMount = useCallback((monaco: any) => {
    if (!monacoReady.current) {
      registerArduinoTheme(monaco);
      monacoReady.current = true;
    }
  }, []);

  return (
    <div className={styles.panel}>
      {/* Custom file tab bar */}
      <div className={styles.fileTabs}>
        {/* Fixed: sketch.ino */}
        <button
          className={`${styles.fileTab} ${activeTab === "sketch" ? styles.fileTabActive : ""}`}
          onClick={() => setActiveTab("sketch")}
        >
          sketch.ino
        </button>

        {/* Dynamic project files */}
        {projectFiles.map((f) => (
          <div
            key={f.name}
            className={`${styles.fileTab} ${activeTab === `file:${f.name}` ? styles.fileTabActive : ""}`}
            onClick={() => { if (!renamingFile) setActiveTab(`file:${f.name}`); }}
            onDoubleClick={() => handleDoubleClick(f.name)}
          >
            {renamingFile === f.name ? (
              <span className={styles.renameWrap}>
                <input
                  ref={renameInputRef}
                  className={styles.renameInput}
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={handleRenameKeyDown}
                  onBlur={commitRename}
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  className={styles.deleteBtn}
                  onClick={(e) => { e.stopPropagation(); handleDeleteFile(f.name); }}
                  title="Delete file"
                >
                  ×
                </button>
              </span>
            ) : (
              f.name
            )}
          </div>
        ))}

        {/* Fixed: diagram.json, board.kicad_pcb, libraries.txt */}
        <button
          className={`${styles.fileTab} ${activeTab === "diagram" ? styles.fileTabActive : ""}`}
          onClick={() => setActiveTab("diagram")}
        >
          diagram.json
        </button>
        <button
          className={`${styles.fileTab} ${activeTab === "pcb" ? styles.fileTabActive : ""}`}
          onClick={() => setActiveTab("pcb")}
        >
          board.kicad_pcb
        </button>
        <button
          className={`${styles.fileTab} ${activeTab === "libraries" ? styles.fileTabActive : ""}`}
          onClick={() => setActiveTab("libraries")}
        >
          libraries.txt
        </button>

        {/* Add file button — at the end */}
        <button className={styles.addFileBtn} onClick={handleAddFile} title="Add file">
          +
        </button>
      </div>

      <div className={styles.editorWrap}>
        <MonacoEditor
          height="100%"
          theme={currentTheme}
          language={currentLanguage}
          value={currentValue}
          onChange={handleEditorChange}
          beforeMount={handleBeforeMount}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: "on",
          }}
        />
      </div>
    </div>
  );
}
