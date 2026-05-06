/**
 * DebriefChat — Standalone Alistair debrief-prep page for colleagues.
 *
 * Password-gated (no Manus login required).
 * Colleague uploads the client's WOW report PDF, Alistair reads it and
 * helps them prepare for the debrief session.
 */
import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { Upload, Send, Loader2, Lock, FileText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ALISTAIR_AVATAR =
  "https://d2xsxph8kpxj0f.cloudfront.net/107696804/kFbbE6kqNApXGDFpQJUGV7/alistair-avatar_24fddf8e.jpg";

const SESSION_KEY = "debrief_unlocked";

// ─── Types ────────────────────────────────────────────────────────────────────
type ChatMessage = { role: "user" | "assistant"; content: string };

// ─── Conversation stage ───────────────────────────────────────────────────────
type Stage =
  | "ask_name"       // Alistair asks the colleague's name
  | "ask_client"     // Alistair asks who the client is
  | "ask_upload"     // Alistair asks them to upload the report
  | "uploading"      // PDF being processed
  | "recalling"      // Alistair generating the recall message
  | "chat";          // Free conversation

// ─── Colours (matching Lifework brand) ───────────────────────────────────────
const NAVY = "#0a1628";
const CREAM = "#f5f0e8";
const GOLD = "#c9973a";

export default function DebriefChat() {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const [unlocked, setUnlocked] = useState(() => {
    try { return sessionStorage.getItem(SESSION_KEY) === "1"; } catch { return false; }
  });
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // ── Conversation state ────────────────────────────────────────────────────
  const [stage, setStage] = useState<Stage>("ask_name");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [colleagueName, setColleagueName] = useState("");
  const [clientName, setClientName] = useState("");
  const [pdfText, setPdfText] = useState("");
  const [pdfFileName, setPdfFileName] = useState("");
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── tRPC mutations ────────────────────────────────────────────────────────
  const verifyMutation = trpc.debriefChat.verifyPassword.useMutation();
  const extractMutation = trpc.debriefChat.extractPdf.useMutation();
  const chatMutation = trpc.debriefChat.chat.useMutation();
  const recallMutation = trpc.debriefChat.generateRecall.useMutation();

  // ── Scroll to bottom whenever messages change ─────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Initialise conversation once unlocked ─────────────────────────────────
  useEffect(() => {
    if (unlocked && messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: `Hello — it's good to see you. I'm Alistair. Before we get started, could you remind me of your name?`,
      }]);
      setStage("ask_name");
    }
  }, [unlocked]);

  // ── Focus input after stage changes ──────────────────────────────────────
  useEffect(() => {
    if (stage !== "uploading" && stage !== "recalling") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [stage]);

  // ─── Password gate ────────────────────────────────────────────────────────
  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");
    try {
      const result = await verifyMutation.mutateAsync({ password: passwordInput });
      if (result.valid) {
        try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* ignore */ }
        setUnlocked(true);
      } else {
        setPasswordError("Incorrect password. Please try again.");
        setPasswordInput("");
      }
    } catch {
      setPasswordError("Something went wrong. Please try again.");
    }
  }

  // ─── Send a user message and handle stage transitions ────────────────────
  async function handleSend(text?: string) {
    const userText = (text ?? inputText).trim();
    if (!userText) return;
    setInputText("");

    const userMsg: ChatMessage = { role: "user", content: userText };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsSending(true);

    try {
      if (stage === "ask_name") {
        // Capture colleague name, move to ask_client
        const name = userText.split(" ")[0]; // use first name
        setColleagueName(name);
        const reply = `Lovely to meet you, ${name}. Now — who is the client you're preparing to meet? Just give me their full name.`;
        setMessages([...updatedMessages, { role: "assistant", content: reply }]);
        setStage("ask_client");

      } else if (stage === "ask_client") {
        // Capture client name, move to ask_upload
        setClientName(userText);
        const firstName = userText.split(" ")[0];
        const reply = `${firstName} — good. Now, could you upload their WOW report? Just click the upload button below and select the PDF as sent to the client — annexes and all.`;
        setMessages([...updatedMessages, { role: "assistant", content: reply }]);
        setStage("ask_upload");

      } else if (stage === "chat") {
        // Free chat — call the LLM
        const conversationHistory = updatedMessages.slice(0, -1).map(m => ({
          role: m.role,
          content: m.content,
        }));
        const result = await chatMutation.mutateAsync({
          pdfText,
          colleagueName,
          clientName,
          messages: conversationHistory,
          newMessage: userText,
        });
        setMessages([...updatedMessages, { role: "assistant", content: result.reply }]);
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Something went wrong. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  // ─── PDF upload ───────────────────────────────────────────────────────────
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please upload a PDF file.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("File too large. Please upload a PDF under 20 MB.");
      return;
    }

    setStage("uploading");
    setPdfFileName(file.name);

    // Show an uploading message
    const uploadingMsg: ChatMessage = {
      role: "assistant",
      content: `*Uploading ${file.name}…*`,
    };
    setMessages(prev => [...prev, uploadingMsg]);

    try {
      // Convert to base64
      const arrayBuffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]);
      const base64 = btoa(binary);

      const result = await extractMutation.mutateAsync({
        fileBase64: base64,
        fileName: file.name,
      });

      setPdfText(result.extractedText);

      // Remove the uploading message and add a success note
      setMessages(prev => {
        const withoutUploading = prev.filter(m => !m.content.startsWith("*Uploading"));
        return [...withoutUploading, {
          role: "assistant",
          content: `*Report received (${Math.round(result.charCount / 1000)}k characters extracted). Let me read it…*`,
        }];
      });

      // Use detected client name if available and better than what was typed
      const resolvedClientName = result.detectedClientName
        ? `${result.detectedClientName} ${clientName.split(" ").slice(1).join(" ")}`.trim()
        : clientName;
      if (result.detectedClientName) setClientName(resolvedClientName);

      setStage("recalling");

      // Generate the recall message
      const recallResult = await recallMutation.mutateAsync({
        pdfText: result.extractedText,
        colleagueName,
        clientName: resolvedClientName,
      });

      setMessages(prev => {
        const withoutReading = prev.filter(m => !m.content.startsWith("*Report received"));
        return [...withoutReading, { role: "assistant", content: recallResult.recall }];
      });

      setStage("chat");
    } catch (err: any) {
      setMessages(prev => prev.filter(m => !m.content.startsWith("*Upload")));
      toast.error(err?.message ?? "Could not process the PDF. Please try again.");
      setStage("ask_upload");
    } finally {
      // Reset file input so the same file can be re-uploaded if needed
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // ─── Reset conversation ───────────────────────────────────────────────────
  function handleReset() {
    setStage("ask_name");
    setMessages([{
      role: "assistant",
      content: `Hello again. Could you remind me of your name?`,
    }]);
    setColleagueName("");
    setClientName("");
    setPdfText("");
    setPdfFileName("");
    setInputText("");
  }

  // ─── Render: password gate ────────────────────────────────────────────────
  if (!unlocked) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-4"
        style={{ background: NAVY }}
      >
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="flex flex-col items-center mb-10">
            <img
              src={ALISTAIR_AVATAR}
              alt="Alistair"
              className="w-24 h-24 rounded-full object-cover mb-4"
              style={{ border: `3px solid ${GOLD}` }}
            />
            <div
              className="text-xs tracking-widest uppercase mb-1"
              style={{ color: GOLD, fontFamily: "var(--sans, sans-serif)", letterSpacing: "0.3em" }}
            >
              Pennington Hennessy
            </div>
            <h1
              className="text-2xl font-bold"
              style={{ color: CREAM, fontFamily: "var(--serif, serif)" }}
            >
              Debrief with Alistair
            </h1>
            <p
              className="text-sm text-center mt-2"
              style={{ color: "rgba(245,240,232,0.55)", fontFamily: "var(--serif, serif)", fontStyle: "italic" }}
            >
              A private space to prepare for your client meeting.
            </p>
          </div>

          {/* Password form */}
          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            <div className="relative">
              <Lock
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: GOLD }}
              />
              <input
                type="password"
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                placeholder="Enter access password"
                className="w-full pl-9 pr-4 py-3 rounded-lg text-sm outline-none"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: `1px solid rgba(201,151,58,0.35)`,
                  color: CREAM,
                  fontFamily: "var(--serif, serif)",
                }}
                autoFocus
              />
            </div>
            {passwordError && (
              <p className="text-sm text-red-400">{passwordError}</p>
            )}
            <Button
              type="submit"
              disabled={verifyMutation.isPending || !passwordInput}
              className="w-full py-3"
              style={{ background: GOLD, color: NAVY, fontFamily: "var(--sans, sans-serif)", letterSpacing: "0.08em" }}
            >
              {verifyMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Enter"
              )}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // ─── Render: main chat ────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: NAVY }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-4 h-14"
        style={{
          background: NAVY,
          borderBottom: `1px solid rgba(201,151,58,0.2)`,
        }}
      >
        <div className="flex items-center gap-3">
          <img
            src={ALISTAIR_AVATAR}
            alt="Alistair"
            className="w-8 h-8 rounded-full object-cover"
            style={{ border: `2px solid ${GOLD}` }}
          />
          <div>
            <div
              className="text-sm font-semibold leading-tight"
              style={{ color: CREAM, fontFamily: "var(--serif, serif)" }}
            >
              Alistair
            </div>
            <div
              className="text-xs"
              style={{ color: GOLD, fontFamily: "var(--sans, sans-serif)", letterSpacing: "0.15em" }}
            >
              DEBRIEF PREP
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pdfFileName && (
            <div
              className="hidden sm:flex items-center gap-1.5 text-xs px-2 py-1 rounded"
              style={{ background: "rgba(201,151,58,0.12)", color: GOLD }}
            >
              <FileText className="w-3 h-3" />
              {pdfFileName.length > 30 ? pdfFileName.slice(0, 27) + "…" : pdfFileName}
            </div>
          )}
          <button
            onClick={handleReset}
            title="Start a new conversation"
            className="p-1.5 rounded transition-opacity hover:opacity-70"
            style={{ color: "rgba(245,240,232,0.5)" }}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5 max-w-2xl mx-auto w-full">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
          >
            {msg.role === "assistant" && (
              <img
                src={ALISTAIR_AVATAR}
                alt="Alistair"
                className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5"
                style={{ border: `2px solid ${GOLD}` }}
              />
            )}
            <div
              className="max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
              style={
                msg.role === "assistant"
                  ? {
                      background: "rgba(255,255,255,0.06)",
                      color: CREAM,
                      fontFamily: "var(--serif, serif)",
                      borderTopLeftRadius: 4,
                    }
                  : {
                      background: GOLD,
                      color: NAVY,
                      fontFamily: "var(--serif, serif)",
                      fontWeight: 500,
                      borderTopRightRadius: 4,
                    }
              }
            >
              {msg.role === "assistant" ? (
                <Streamdown>{msg.content}</Streamdown>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isSending && (
          <div className="flex gap-3">
            <img
              src={ALISTAIR_AVATAR}
              alt="Alistair"
              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
              style={{ border: `2px solid ${GOLD}` }}
            />
            <div
              className="flex items-center gap-1.5 px-4 py-3 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.06)", borderTopLeftRadius: 4 }}
            >
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full animate-bounce"
                  style={{ background: GOLD, animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div
        className="sticky bottom-0 px-4 py-3"
        style={{ background: NAVY, borderTop: `1px solid rgba(201,151,58,0.15)` }}
      >
        <div className="max-w-2xl mx-auto flex items-end gap-2">
          {/* PDF upload button — shown during ask_upload stage and in chat */}
          {(stage as string) !== "ask_name" && (stage as string) !== "ask_client" && (stage as string) !== "chat" || stage === "ask_upload" || stage === "chat" ? (
            <></> // placeholder
          ) : null}
          {(stage === "ask_upload" || stage === "chat") ? (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={(stage as string) === "uploading" || (stage as string) === "recalling"}
                title="Upload client WOW report PDF"
                className="flex-shrink-0 p-2.5 rounded-xl transition-opacity hover:opacity-80 disabled:opacity-40"
                style={{ background: "rgba(201,151,58,0.15)", color: GOLD }}
              >
                {(stage as string) === "uploading" || (stage as string) === "recalling" ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Upload className="w-5 h-5" />
                )}
              </button>
            </>
          ) : null}

          <Input
            ref={inputRef}
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={
              stage === "ask_name" ? "Type your name…"
              : stage === "ask_client" ? "Type the client's full name…"
              : stage === "ask_upload" ? "Or type the client's name to confirm…"
              : stage === "uploading" || stage === "recalling" ? "Reading report…"
              : "Ask Alistair anything…"
            }
            disabled={isSending || (stage as string) === "uploading" || (stage as string) === "recalling"}
            className="flex-1 rounded-xl border-0 text-sm py-2.5"
            style={{
              background: "rgba(255,255,255,0.07)",
              color: CREAM,
              fontFamily: "var(--serif, serif)",
              caretColor: GOLD,
            }}
          />

          <button
            onClick={() => handleSend()}
            disabled={!inputText.trim() || isSending || (stage as string) === "uploading" || (stage as string) === "recalling"}
            className="flex-shrink-0 p-2.5 rounded-xl transition-opacity hover:opacity-80 disabled:opacity-30"
            style={{ background: GOLD, color: NAVY }}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p
          className="text-center text-xs mt-2"
          style={{ color: "rgba(245,240,232,0.3)", fontFamily: "var(--serif, serif)", fontStyle: "italic" }}
        >
          This conversation is private and not stored. Press ↺ to start again.
        </p>
      </div>
    </div>
  );
}
