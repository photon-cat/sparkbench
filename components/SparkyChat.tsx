"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import AddIcon from "@mui/icons-material/Add";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
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

interface SparkyChatProps {
  open: boolean;
  onToggle: () => void;
  slug: string;
  diagramJson: string;
  sketchCode: string;
  pcbText: string | null;
  librariesTxt: string;
  projectFiles: { name: string; content: string }[];
  onProjectChanged?: () => void;
}

const SUGGESTIONS = [
  "Design a circuit for me",
  "Debug my code",
  "Add a sensor",
  "Explain this circuit",
];

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function deriveTitle(messages: ChatMessage[]): string {
  const first = messages.find((m) => m.role === "user");
  if (!first) return "New chat";
  const text = first.content.slice(0, 60);
  return text.length < first.content.length ? text + "..." : text;
}

export default function SparkyChat({
  open,
  onToggle,
  slug,
  diagramJson,
  sketchCode,
  pcbText,
  librariesTxt,
  projectFiles,
  onProjectChanged,
}: SparkyChatProps) {
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [panelHeight, setPanelHeight] = useState(420);
  const [loaded, setLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const resizingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  const activeChat = chats.find((c) => c.id === activeChatId) || null;
  const messages = activeChat?.messages || [];

  // Load chats from server on mount
  useEffect(() => {
    if (!slug) return;
    fetch(`/api/projects/${slug}/chats`)
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
  }, [slug]);

  // Save chats to server
  const saveChats = useCallback((updatedChats: ChatSession[]) => {
    fetch(`/api/projects/${slug}/chats`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chats: updatedChats }),
    }).catch((err) => console.error("Failed to save chats:", err));
  }, [slug]);

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
          slug,
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
              case "done":
                if (filesChanged && onProjectChanged) onProjectChanged();
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
  }, [streaming, activeChatId, chats, slug, diagramJson, sketchCode, pcbText, librariesTxt, projectFiles, onProjectChanged, saveChats]);

  // --- Resize logic ---
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizingRef.current = true;
    startYRef.current = e.clientY;
    startHeightRef.current = panelHeight;

    const handleResizeMove = (ev: MouseEvent) => {
      if (!resizingRef.current) return;
      const delta = startYRef.current - ev.clientY;
      const newHeight = Math.min(Math.max(startHeightRef.current + delta, 200), window.innerHeight - 60);
      setPanelHeight(newHeight);
    };

    const handleResizeEnd = () => {
      resizingRef.current = false;
      document.removeEventListener("mousemove", handleResizeMove);
      document.removeEventListener("mouseup", handleResizeEnd);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "ns-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", handleResizeMove);
    document.addEventListener("mouseup", handleResizeEnd);
  }, [panelHeight]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
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
      {/* Centered bottom handle — visible when closed */}
      <button
        className={`${styles.handle} ${open ? styles.handleHidden : ""}`}
        onClick={onToggle}
        title="Toggle Sparky"
      >
        <AutoAwesomeIcon sx={{ fontSize: 20 }} />
      </button>

      {/* Floating panel */}
      {open && (
        <div className={styles.panel} style={{ height: panelHeight }}>
            {/* Resize handle */}
            <div className={styles.resizeHandle} onMouseDown={handleResizeStart}>
              <div className={styles.resizeGrip} />
            </div>
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
                      {messages.map((msg, i) => (
                        <div key={i} className={`${styles.message} ${msg.role === "user" ? styles.messageUser : styles.messageAssistant}`}>
                          {msg.tools && msg.tools.length > 0 && (
                            <div className={styles.toolRow}>
                              {msg.tools.map((tool, j) => (
                                <span key={j} className={styles.toolBadge}>
                                  <span className={styles.toolName}>{tool.name}</span>
                                  {tool.detail && <span className={styles.toolDetail}>{tool.detail}</span>}
                                </span>
                              ))}
                            </div>
                          )}
                          {msg.content && (
                            <div className={styles.messageContent}>{msg.content}</div>
                          )}
                          {msg.role === "assistant" && !msg.content && streaming && i === messages.length - 1 && (
                            <div className={styles.thinking}>
                              <div className={styles.dot} />
                              <div className={styles.dot} />
                              <div className={styles.dot} />
                            </div>
                          )}
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className={styles.inputArea}>
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
                    <button
                      className={styles.sendBtn}
                      onClick={() => sendMessage(input)}
                      disabled={streaming || !input.trim()}
                      title="Send"
                    >
                      <SendIcon sx={{ fontSize: 18 }} />
                    </button>
                  </div>
                </div>
              </>
            )}
        </div>
      )}
    </>
  );
}
