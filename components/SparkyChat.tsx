"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import AddIcon from "@mui/icons-material/Add";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckIcon from "@mui/icons-material/Check";
import UndoIcon from "@mui/icons-material/Undo";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import StopIcon from "@mui/icons-material/Stop";
import ReactMarkdown from "react-markdown";
import { diffLines } from "@/lib/diff";
import styles from "./SparkyChat.module.css";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  tools?: { name: string; detail: string }[];
}

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface FileSnapshot {
  diagram: string;
  sketch: string;
  pcb: string | null;
  libraries: string;
  files: { name: string; content: string }[];
}

interface SparkyChatProps {
  open: boolean;
  onToggle: () => void;
  projectId: string;
  diagramJson: string;
  sketchCode: string;
  pcbText: string | null;
  librariesTxt: string;
  projectFiles: { name: string; content: string }[];
  onProjectChanged?: () => void;
  onChangesReady?: (snapshot: FileSnapshot) => void;
  onRevertChanges?: (snapshot: FileSnapshot) => void;
  onAcceptChanges?: () => void;
  onSimStart?: () => void;
  onSimStop?: () => void;
  onUpdatePCB?: () => void;
  pendingReview?: FileSnapshot | null;
  currentSnapshot?: FileSnapshot | null;
  initialMessage?: string | null;
  onInitialMessageConsumed?: () => void;
}

const SUGGESTIONS = [
  "Design a circuit for me",
  "Debug my code",
  "Add a sensor",
  "Explain this circuit",
];

/** Tools that get rich card rendering */
const RICH_TOOLS = new Set(["Write", "Edit", "Bash", "Read"]);

/** Derive a human-readable status label from the last tool call */
function toolStatusLabel(tools: { name: string; detail: string }[]): { action: string; detail: string } {
  if (tools.length === 0) return { action: "Planning", detail: "next moves" };
  const last = tools[tools.length - 1];
  switch (last.name) {
    case "Write": return { action: "Writing", detail: last.detail || "file" };
    case "Edit": return { action: "Editing", detail: last.detail || "file" };
    case "Read": return { action: "Reading", detail: last.detail || "file" };
    case "Bash": return { action: "Running", detail: last.detail?.slice(0, 60) || "command" };
    case "Glob": return { action: "Searching", detail: last.detail || "files" };
    case "Grep": return { action: "Searching", detail: last.detail || "code" };
    case "mcp__sparkbench__CheckFloorplan": return { action: "Checking", detail: "PCB floorplan" };
    case "mcp__sparkbench__SetBoardSize": return { action: "Setting", detail: `board size ${last.detail}` };
    case "mcp__sparkbench__UpdatePCB": return { action: "Updating", detail: "PCB layout" };
    default: return { action: "Using", detail: last.name };
  }
}

function ToolCard({ tool }: { tool: { name: string; detail: string } }) {
  if (!RICH_TOOLS.has(tool.name)) {
    return (
      <span className={styles.toolBadge}>
        <span className={styles.toolName}>{tool.name}</span>
        {tool.detail && <span className={styles.toolDetail}>{tool.detail}</span>}
      </span>
    );
  }

  let label = "";
  let body = "";
  switch (tool.name) {
    case "Write":
      label = `Wrote ${tool.detail || "file"}`;
      break;
    case "Edit":
      label = `Edited ${tool.detail || "file"}`;
      break;
    case "Read":
      label = `Read ${tool.detail || "file"}`;
      break;
    case "Bash":
      label = "Ran command";
      body = tool.detail || "";
      break;
  }

  return (
    <div className={styles.toolCard}>
      <div className={styles.toolCardHeader}>
        <span className={styles.toolCardIcon}>{tool.name === "Bash" ? "$" : tool.name === "Read" ? ">" : "+"}</span>
        <span className={styles.toolCardLabel}>{label}</span>
      </div>
      {body && (
        <div className={styles.toolCardBody}>
          <code>{body}</code>
        </div>
      )}
    </div>
  );
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function deriveTitle(messages: ChatMessage[]): string {
  const first = messages.find((m) => m.role === "user");
  if (!first) return "New chat";
  const text = first.content.slice(0, 60);
  return text.length < first.content.length ? text + "..." : text;
}

// --- Diff Review Component ---

function DiffReview({
  pendingReview,
  currentSnapshot,
  onAccept,
  onReject,
}: {
  pendingReview: FileSnapshot;
  currentSnapshot: FileSnapshot;
  onAccept: () => void;
  onReject: () => void;
}) {
  const [expandedFile, setExpandedFile] = useState<string | null>(null);

  // Compute which files changed
  const changedFiles: { name: string; oldText: string; newText: string }[] = [];

  if (pendingReview.sketch !== currentSnapshot.sketch) {
    changedFiles.push({ name: "sketch.ino", oldText: pendingReview.sketch, newText: currentSnapshot.sketch });
  }
  if (pendingReview.diagram !== currentSnapshot.diagram) {
    changedFiles.push({ name: "diagram.json", oldText: pendingReview.diagram, newText: currentSnapshot.diagram });
  }
  if ((pendingReview.pcb || "") !== (currentSnapshot.pcb || "")) {
    changedFiles.push({ name: "board.kicad_pcb", oldText: pendingReview.pcb || "", newText: currentSnapshot.pcb || "" });
  }
  if (pendingReview.libraries !== currentSnapshot.libraries) {
    changedFiles.push({ name: "libraries.txt", oldText: pendingReview.libraries, newText: currentSnapshot.libraries });
  }

  // Check additional files
  const oldFileMap = new Map(pendingReview.files.map(f => [f.name, f.content]));
  const newFileMap = new Map(currentSnapshot.files.map(f => [f.name, f.content]));
  const allFileNames = new Set([...oldFileMap.keys(), ...newFileMap.keys()]);
  for (const name of allFileNames) {
    const oldContent = oldFileMap.get(name) || "";
    const newContent = newFileMap.get(name) || "";
    if (oldContent !== newContent) {
      changedFiles.push({ name, oldText: oldContent, newText: newContent });
    }
  }

  if (changedFiles.length === 0) return null;

  return (
    <div className={styles.diffBar}>
      <div className={styles.diffHeader}>
        <span className={styles.diffTitle}>
          Sparky modified {changedFiles.length} file{changedFiles.length !== 1 ? "s" : ""}
        </span>
        <div className={styles.diffActions}>
          <button className={styles.rejectBtn} onClick={onReject} title="Revert changes">
            <UndoIcon sx={{ fontSize: 14 }} />
            Reject
          </button>
          <button className={styles.acceptBtn} onClick={onAccept} title="Accept changes">
            <CheckIcon sx={{ fontSize: 14 }} />
            Accept
          </button>
        </div>
      </div>
      <div className={styles.diffFiles}>
        {changedFiles.map((file) => {
          const isExpanded = expandedFile === file.name;
          const diff = isExpanded ? diffLines(file.oldText, file.newText) : [];
          const addCount = isExpanded ? diff.filter(d => d.type === "add").length : 0;
          const delCount = isExpanded ? diff.filter(d => d.type === "del").length : 0;

          return (
            <div key={file.name} className={styles.diffFile}>
              <button
                className={styles.diffFileHeader}
                onClick={() => setExpandedFile(isExpanded ? null : file.name)}
              >
                {isExpanded ? <ExpandLessIcon sx={{ fontSize: 14 }} /> : <ExpandMoreIcon sx={{ fontSize: 14 }} />}
                <span className={styles.diffFileName}>{file.name}</span>
                {isExpanded && (
                  <span className={styles.diffStats}>
                    <span className={styles.diffStatsAdd}>+{addCount}</span>
                    <span className={styles.diffStatsDel}>-{delCount}</span>
                  </span>
                )}
              </button>
              {isExpanded && (
                <div className={styles.diffContent}>
                  {diff.map((line, idx) => (
                    <div
                      key={idx}
                      className={`${styles.diffLine} ${
                        line.type === "add" ? styles.diffAdd :
                        line.type === "del" ? styles.diffDel :
                        ""
                      }`}
                    >
                      <span className={styles.diffPrefix}>
                        {line.type === "add" ? "+" : line.type === "del" ? "-" : " "}
                      </span>
                      <span>{line.content}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Main Component ---

export default function SparkyChat({
  open,
  onToggle,
  projectId,
  diagramJson,
  sketchCode,
  pcbText,
  librariesTxt,
  projectFiles,
  onProjectChanged,
  onChangesReady,
  onRevertChanges,
  onAcceptChanges,
  onSimStart,
  onSimStop,
  onUpdatePCB,
  pendingReview,
  currentSnapshot,
  initialMessage,
  onInitialMessageConsumed,
}: SparkyChatProps) {
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] = useState("claude-sonnet-4-6");
  const [streaming, setStreaming] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const activeChat = chats.find((c) => c.id === activeChatId) || null;
  const messages = activeChat?.messages || [];

  // Load chats from server on mount
  useEffect(() => {
    if (!projectId) return;
    fetch(`/api/projects/${projectId}/chats`)
      .then((res) => res.json())
      .then((data) => {
        const loaded = data.chats || [];
        setChats(loaded);
        // Open the most recent chat, or show history if multiple
        if (loaded.length === 1) {
          setActiveChatId(loaded[0].id);
        } else if (loaded.length > 1) {
          setShowHistory(true);
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [projectId]);

  // Save chats to server
  const saveChats = useCallback((updatedChats: ChatSession[]) => {
    fetch(`/api/projects/${projectId}/chats`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chats: updatedChats }),
    }).catch((err) => console.error("Failed to save chats:", err));
  }, [projectId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  // Focus input when opened
  useEffect(() => {
    if (open && !streaming && !showHistory) {
      inputRef.current?.focus();
    }
  }, [open, streaming, showHistory]);

  // Auto-send initial message (e.g., from "Debug with Sparky" button)
  useEffect(() => {
    if (initialMessage && open && !streaming) {
      sendMessage(initialMessage);
      onInitialMessageConsumed?.();
    }
  }, [initialMessage, open]); // eslint-disable-line react-hooks/exhaustive-deps

  const startNewChat = useCallback(() => {
    const newChat: ChatSession = {
      id: generateId(),
      title: "New chat",
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [newChat, ...chats];
    setChats(updated);
    setActiveChatId(newChat.id);
    setShowHistory(false);
  }, [chats]);

  const openChat = useCallback((id: string) => {
    setActiveChatId(id);
    setShowHistory(false);
  }, []);

  const deleteChat = useCallback((id: string) => {
    const updated = chats.filter((c) => c.id !== id);
    setChats(updated);
    saveChats(updated);
    if (activeChatId === id) {
      setActiveChatId(null);
      if (updated.length > 0) {
        setShowHistory(true);
      }
    }
  }, [chats, activeChatId, saveChats]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || streaming) return;

    // Snapshot current state before sending
    const snapshot: FileSnapshot = {
      diagram: diagramJson,
      sketch: sketchCode,
      pcb: pcbText,
      libraries: librariesTxt,
      files: [...projectFiles],
    };

    // If no active chat, create one
    let chatId = activeChatId;
    let currentChats = chats;
    if (!chatId) {
      const newChat: ChatSession = {
        id: generateId(),
        title: "New chat",
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      currentChats = [newChat, ...chats];
      chatId = newChat.id;
      setChats(currentChats);
      setActiveChatId(chatId);
      setShowHistory(false);
    }

    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    const assistantMsg: ChatMessage = { role: "assistant", content: "", tools: [] };

    // Add user + placeholder assistant message
    const withUser = currentChats.map((c) =>
      c.id === chatId
        ? { ...c, messages: [...c.messages, userMsg, assistantMsg], title: c.messages.length === 0 ? deriveTitle([userMsg]) : c.title, updatedAt: new Date().toISOString() }
        : c
    );
    setChats(withUser);
    setInput("");
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    let currentContent = "";
    let currentTools: { name: string; detail: string }[] = [];
    let filesChanged = false;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text.trim(),
          projectId,
          model: selectedModel,
          context: { diagramJson, sketchCode, pcbText, librariesTxt, files: projectFiles },
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);
            switch (event.type) {
              case "text_delta":
                currentContent += event.content;
                setChats((prev) => prev.map((c) => {
                  if (c.id !== chatId) return c;
                  const msgs = [...c.messages];
                  const last = msgs[msgs.length - 1];
                  if (last?.role === "assistant") {
                    msgs[msgs.length - 1] = { ...last, content: currentContent, tools: [...currentTools] };
                  }
                  return { ...c, messages: msgs };
                }));
                break;
              case "tool":
                currentTools.push({ name: event.name, detail: event.detail || "" });
                if (event.name === "Write" || event.name === "Edit") filesChanged = true;
                setChats((prev) => prev.map((c) => {
                  if (c.id !== chatId) return c;
                  const msgs = [...c.messages];
                  const last = msgs[msgs.length - 1];
                  if (last?.role === "assistant") {
                    msgs[msgs.length - 1] = { ...last, content: currentContent, tools: [...currentTools] };
                  }
                  return { ...c, messages: msgs };
                }));
                break;
              case "pcb_command":
                if (event.action === "update") {
                  if (filesChanged && onProjectChanged) {
                    onProjectChanged();
                    filesChanged = false;
                  }
                  setTimeout(() => onUpdatePCB?.(), 300);
                }
                break;
              case "sim_command":
                if (event.action === "start") {
                  // Reload files first so the build uses the latest code
                  if (filesChanged && onProjectChanged) {
                    onProjectChanged();
                    filesChanged = false; // don't trigger diff review for sim runs
                  }
                  // Small delay to let file reload settle before build
                  setTimeout(() => onSimStart?.(), 300);
                } else if (event.action === "stop") {
                  onSimStop?.();
                }
                break;
              case "done":
                if (filesChanged) {
                  if (onChangesReady) {
                    onChangesReady(snapshot);
                  } else if (onProjectChanged) {
                    onProjectChanged();
                  }
                }
                break;
              case "error":
                currentContent += `\n\n[Error: ${event.message}]`;
                setChats((prev) => prev.map((c) => {
                  if (c.id !== chatId) return c;
                  const msgs = [...c.messages];
                  const last = msgs[msgs.length - 1];
                  if (last?.role === "assistant") {
                    msgs[msgs.length - 1] = { ...last, content: currentContent };
                  }
                  return { ...c, messages: msgs };
                }));
                break;
            }
          } catch { /* skip malformed lines */ }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        currentContent += `\n\n[Connection error: ${err.message}]`;
        setChats((prev) => prev.map((c) => {
          if (c.id !== chatId) return c;
          const msgs = [...c.messages];
          const last = msgs[msgs.length - 1];
          if (last?.role === "assistant") {
            msgs[msgs.length - 1] = { ...last, content: currentContent };
          }
          return { ...c, messages: msgs };
        }));
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
      // Save after streaming completes
      setChats((prev) => {
        saveChats(prev);
        return prev;
      });
    }
  }, [streaming, activeChatId, chats, projectId, selectedModel, diagramJson, sketchCode, pcbText, librariesTxt, projectFiles, onProjectChanged, onChangesReady, onSimStart, onSimStop, onUpdatePCB, saveChats]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }, [input, sendMessage]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString([], { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <>
      {/* Sidebar panel */}
      {open && (
        <div className={styles.panelRight}>
            {/* Header */}
            <div className={styles.header}>
              <div className={styles.headerLeft}>
                {activeChatId && !showHistory && chats.length > 0 && (
                  <button className={styles.backBtn} onClick={() => setShowHistory(true)} title="Chat history">
                    <ArrowBackIcon sx={{ fontSize: 16 }} />
                  </button>
                )}
                <span className={styles.title}>
                  {showHistory ? "Chat History" : activeChat?.title || "Sparky"}
                </span>
              </div>
              <div className={styles.headerRight}>
                {!showHistory && (
                  <button className={styles.newChatBtn} onClick={startNewChat} title="New chat">
                    <AddIcon sx={{ fontSize: 16 }} />
                  </button>
                )}
                <button className={styles.closeBtn} onClick={onToggle}>
                  <CloseIcon sx={{ fontSize: 18 }} />
                </button>
              </div>
            </div>

            {/* Chat history list */}
            {showHistory ? (
              <div className={styles.body}>
                <div className={styles.historyList}>
                  <button className={styles.newChatItem} onClick={startNewChat}>
                    <AddIcon sx={{ fontSize: 16 }} />
                    <span>New chat</span>
                  </button>
                  {chats.map((chat) => (
                    <div key={chat.id} className={styles.historyItem}>
                      <button className={styles.historyItemBtn} onClick={() => openChat(chat.id)}>
                        <span className={styles.historyTitle}>{chat.title}</span>
                        <span className={styles.historyMeta}>
                          {chat.messages.length} messages &middot; {formatDate(chat.updatedAt)}
                        </span>
                      </button>
                      <button className={styles.historyDelete} onClick={() => deleteChat(chat.id)} title="Delete chat">
                        <CloseIcon sx={{ fontSize: 14 }} />
                      </button>
                    </div>
                  ))}
                  {chats.length === 0 && (
                    <div className={styles.historyEmpty}>No chats yet</div>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Diff review banner */}
                {pendingReview && currentSnapshot && onAcceptChanges && onRevertChanges && (
                  <DiffReview
                    pendingReview={pendingReview}
                    currentSnapshot={currentSnapshot}
                    onAccept={onAcceptChanges}
                    onReject={() => onRevertChanges(pendingReview)}
                  />
                )}

                {/* Body */}
                <div className={styles.body}>
                  {/* Welcome + suggestions when empty */}
                  {messages.length === 0 && !streaming && (
                    <div className={styles.welcome}>
                      <h2 className={styles.greeting}>Hello!</h2>
                      <p className={styles.subtitle}>How can I help you today?</p>
                      <div className={styles.suggestions}>
                        {SUGGESTIONS.map((s) => (
                          <button key={s} className={styles.suggestion} onClick={() => sendMessage(s)}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Messages */}
                  {messages.length > 0 && (
                    <div className={styles.messages}>
                      {messages.map((msg, i) => {
                        const isLastAssistant = msg.role === "assistant" && i === messages.length - 1;
                        const isStreaming = isLastAssistant && streaming;
                        return (
                          <div key={i} className={`${styles.message} ${msg.role === "user" ? styles.messageUser : styles.messageAssistant}`}>
                            {msg.tools && msg.tools.length > 0 && (
                              <div className={styles.toolRow}>
                                {msg.tools.map((tool, j) => (
                                  <ToolCard key={j} tool={tool} />
                                ))}
                              </div>
                            )}
                            {msg.content && (
                              <div className={styles.messageContent}>
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                              </div>
                            )}
                            {isStreaming && (() => {
                              const status = toolStatusLabel(msg.tools || []);
                              return (
                                <div className={styles.statusIndicator}>
                                  <div className={styles.statusSpinner} />
                                  <span className={styles.statusText}>
                                    <span className={styles.statusAction}>{status.action}</span>{" "}
                                    <span className={styles.statusDetail}>{status.detail}</span>
                                  </span>
                                </div>
                              );
                            })()}
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className={styles.inputArea}>
                  <div className={styles.modelRow}>
                    <select
                      className={styles.modelSelect}
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      disabled={streaming}
                    >
                      <option value="claude-haiku-4-5-20251001">Haiku 4.5</option>
                      <option value="claude-sonnet-4-6">Sonnet 4.6</option>
                      <option value="claude-opus-4-6">Opus 4.6</option>
                    </select>
                  </div>
                  <div className={styles.inputBox}>
                    <textarea
                      ref={inputRef}
                      className={styles.input}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="What can I help you build?"
                      rows={1}
                      disabled={streaming}
                    />
                    {streaming ? (
                      <button
                        className={styles.stopBtn}
                        onClick={() => abortRef.current?.abort()}
                        title="Stop agent"
                      >
                        <StopIcon sx={{ fontSize: 18 }} />
                      </button>
                    ) : (
                      <button
                        className={styles.sendBtn}
                        onClick={() => sendMessage(input)}
                        disabled={!input.trim()}
                        title="Send"
                      >
                        <SendIcon sx={{ fontSize: 18 }} />
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
        </div>
      )}
    </>
  );
}
