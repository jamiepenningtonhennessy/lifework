import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, Send, Trash2, Compass, Lock, Download, Upload } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { Streamdown } from "streamdown";
import { toast } from "sonner";

const ALISTAIR_AVATAR = "https://d2xsxph8kpxj0f.cloudfront.net/107696804/kFbbE6kqNApXGDFpQJUGV7/alistair-avatar_24fddf8e.jpg";

type Message = {
  role: "advisor" | "client";
  content: string;
  timestamp: number;
};

type SnapshotPayload = {
  version: 1;
  preferredName: string | null;
  messages: Message[];
  savedAt: number;
};

const SUGGESTED_QUESTIONS = [
  "What careers suit me based on my profile?",
  "I'm thinking of becoming a parliamentary researcher — how do my skills match up?",
  "What roles would make the most of my VIA strengths?",
  "What should I do to break into journalism?",
  "How do my life history themes point toward a career direction?",
];

// ── PIN encryption helpers (Web Crypto, client-side only) ──────────────────

async function deriveKey(pin: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(pin),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode("alistair-lifework-salt"),
      iterations: 100_000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptSnapshot(payload: SnapshotPayload, pin: string): Promise<string> {
  const key = await deriveKey(pin);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(JSON.stringify(payload))
  );
  // Encode as base64: iv (12 bytes) + ciphertext
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(Array.from(combined).map((b) => String.fromCharCode(b)).join(""));
}

async function decryptSnapshot(b64: string, pin: string): Promise<SnapshotPayload> {
  const key = await deriveKey(pin);
  const combined = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );
  return JSON.parse(new TextDecoder().decode(plaintext)) as SnapshotPayload;
}

// ── Advisor message renderer ───────────────────────────────────────────────

function parseAdvisorMessage(content: string): { behaviour: string | null; speech: string } {
  const match = content.match(/^\[([^\]]+)\]\s*/);
  if (match) {
    const tag = match[1].trim();
    if (/^behaviour:/i.test(tag) || /^Sage\b/i.test(tag) || /^Alistair\b/i.test(tag)) {
      const behaviour = tag.replace(/^behaviour:\s*/i, "").trim();
      return { behaviour, speech: content.slice(match[0].length).trim() };
    }
  }
  return { behaviour: null, speech: content };
}

function AdvisorMessageBubble({ content }: { content: string }) {
  const { behaviour, speech } = parseAdvisorMessage(content);
  return (
    <div className="max-w-[80%] space-y-1.5">
      {behaviour && (
        <p className="text-xs italic text-muted-foreground px-1 leading-relaxed">{behaviour}</p>
      )}
      <div className="bg-card border border-border text-foreground rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed">
        <Streamdown>{speech}</Streamdown>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function CareerExplorer() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [input, setInput] = useState("");
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [preferredName, setPreferredName] = useState<string | null>(null);
  const [initialised, setInitialised] = useState(false);
  const [openingInjected, setOpeningInjected] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Save dialog state ──────────────────────────────────────────────────
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [savePin, setSavePin] = useState("");
  const [savePin2, setSavePin2] = useState("");
  const [savePending, setSavePending] = useState(false);

  // ── Upload dialog state ────────────────────────────────────────────────
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadPin, setUploadPin] = useState("");
  const [uploadPending, setUploadPending] = useState(false);
  const [pendingFile, setPendingFile] = useState<string | null>(null); // raw b64 content

  // Load profile to check unlock status
  const { data: profile } = trpc.profile.getMyProfile.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  // Load existing session
  const { data: sessionData, isLoading: loadingSession } = trpc.careerExplorer.getSession.useQuery(
    undefined,
    { enabled: isAuthenticated && !!profile?.careerExplorerUnlocked }
  );

  // Inject Alistair's opening message for new sessions
  const getOpeningMessage = trpc.careerExplorer.getOpeningMessage.useMutation({
    onSuccess: (data) => {
      if (data) {
        setSessionId(data.sessionId);
        setLocalMessages([{ role: "advisor", content: data.message.content, timestamp: data.message.timestamp }]);
      }
    },
  });

  useEffect(() => {
    if (sessionData && !initialised) {
      setLocalMessages(sessionData.messages as Message[]);
      setSessionId(sessionData.sessionId);
      setPreferredName((sessionData as any).preferredName ?? null);
      setInitialised(true);
      if ((sessionData.messages as Message[]).length === 0 && !openingInjected) {
        setOpeningInjected(true);
        getOpeningMessage.mutate();
      }
    }
  }, [sessionData, initialised]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages]);

  const sendMessage = trpc.careerExplorer.sendMessage.useMutation({
    onSuccess: (data) => {
      setSessionId(data.sessionId);
      setLocalMessages((prev) => [
        ...prev,
        { role: "advisor", content: data.advisorResponse, timestamp: Date.now() },
      ]);
    },
    onError: () => {
      toast.error("Something went wrong. Please try again.");
      setLocalMessages((prev) => prev.slice(0, -1));
    },
  });

  const clearSession = trpc.careerExplorer.clearSession.useMutation({
    onSuccess: () => {
      setLocalMessages([]);
      setSessionId(null);
      setInitialised(false);
      setOpeningInjected(false);
      setPreferredName(null);
      toast.success("Conversation cleared");
    },
  });

  const resumeFromSnapshot = trpc.careerExplorer.resumeFromSnapshot.useMutation({
    onSuccess: (data) => {
      // Reload the full session from server
      setInitialised(false);
      setOpeningInjected(true);
      setPreferredName(data.preferredName ?? null);
      toast.success("Conversation restored — Alistair remembers you.");
    },
    onError: () => {
      toast.error("Failed to restore conversation. Please try again.");
    },
  });

  const handleSend = (text?: string) => {
    const message = (text ?? input).trim();
    if (!message || sendMessage.isPending) return;
    setLocalMessages((prev) => [
      ...prev,
      { role: "client", content: message, timestamp: Date.now() },
    ]);
    setInput("");
    sendMessage.mutate({ userMessage: message });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Save / download ────────────────────────────────────────────────────

  const handleSaveConfirm = useCallback(async () => {
    if (savePin.length < 4) {
      toast.error("PIN must be at least 4 digits.");
      return;
    }
    if (savePin !== savePin2) {
      toast.error("PINs do not match.");
      return;
    }
    setSavePending(true);
    try {
      const payload: SnapshotPayload = {
        version: 1,
        preferredName,
        messages: localMessages,
        savedAt: Date.now(),
      };
      const encrypted = await encryptSnapshot(payload, savePin);
      const blob = new Blob([encrypted], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `alistair-conversation-${new Date().toISOString().slice(0, 10)}.alistair`;
      // Append to DOM before clicking — required for Safari/Mac to trigger the download
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Defer revoke so Safari has time to initiate the download before the URL is released
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setSaveDialogOpen(false);
      setSavePin("");
      setSavePin2("");
      toast.success("Conversation saved to your device.");
    } catch {
      toast.error("Failed to save conversation.");
    } finally {
      setSavePending(false);
    }
  }, [savePin, savePin2, localMessages, preferredName]);

  // ── Upload / restore ───────────────────────────────────────────────────

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      // Read as ArrayBuffer and manually convert to base64 so Safari does not
      // corrupt the binary data by applying a text encoding during readAsText.
      const buffer = ev.target?.result as ArrayBuffer;
      const bytes = new Uint8Array(buffer);
      const b64 = btoa(Array.from(bytes).map((b) => String.fromCharCode(b)).join(""));
      setPendingFile(b64);
      setUploadPin("");
      setUploadDialogOpen(true);
    };
    reader.readAsArrayBuffer(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  const handleUploadConfirm = useCallback(async () => {
    if (!pendingFile) return;
    if (uploadPin.length < 4) {
      toast.error("Please enter your PIN.");
      return;
    }
    setUploadPending(true);
    try {
      const payload = await decryptSnapshot(pendingFile, uploadPin);
      if (!payload.messages || !Array.isArray(payload.messages)) throw new Error("Invalid file");
      // Send to server — server will replace session and append welcome-back message
      await resumeFromSnapshot.mutateAsync({
        messages: payload.messages,
        preferredName: payload.preferredName ?? null,
      });
      // Reload session from server
      setInitialised(false);
      setUploadDialogOpen(false);
      setUploadPin("");
      setPendingFile(null);
    } catch {
      toast.error("Incorrect PIN or invalid file. Please try again.");
    } finally {
      setUploadPending(false);
    }
  }, [pendingFile, uploadPin]);

  if (!loading && !isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  // Locked state
  if (profile && !profile.careerExplorerUnlocked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: "var(--lw-cream)" }}>
        <div className="max-w-md text-center px-6 space-y-5">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
            style={{ background: "rgba(15,31,53,0.08)", border: "1px solid rgba(201,151,58,0.3)" }}
          >
            <Lock className="w-7 h-7" style={{ color: "var(--lw-gold)" }} />
          </div>
          <h2 className="font-serif text-2xl font-semibold" style={{ color: "var(--lw-navy)" }}>Career Explorer</h2>
          <p className="text-muted-foreground leading-relaxed">
            Your Career Explorer will be activated by your counsellor after your coaching conversation.
            Once unlocked, Alistair will have access to your full Lifework profile and can help you explore
            careers that are authentically yours.
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="text-sm underline"
            style={{ color: "var(--lw-gold)" }}
          >
            Return to dashboard
          </button>
        </div>
      </div>
    );
  }

  const isEmpty = localMessages.length === 0 && !loadingSession && !getOpeningMessage.isPending;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--lw-cream)" }}>
      {/* Hidden file input for upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".alistair"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Header */}
      <div
        className="sticky top-0 z-10"
        style={{ background: "var(--lw-navy)", borderBottom: "1px solid rgba(201,151,58,0.25)" }}
      >
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="p-1.5 cursor-pointer transition-opacity hover:opacity-70"
              style={{ color: "rgba(255,255,255,0.6)" }}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4" style={{ color: "var(--lw-gold)" }} />
              <span className="font-serif font-semibold" style={{ color: "white", fontSize: "1rem" }}>
                Career Explorer — with Alistair
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Upload transcript */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs cursor-pointer transition-opacity hover:opacity-70"
              style={{ color: "rgba(255,255,255,0.5)" }}
              title="Upload a saved conversation"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload
            </button>
            {/* Save conversation */}
            {localMessages.length > 0 && (
              <button
                onClick={() => setSaveDialogOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs cursor-pointer transition-opacity hover:opacity-70"
                style={{ color: "rgba(255,255,255,0.5)" }}
                title="Save conversation to your device"
              >
                <Download className="w-3.5 h-3.5" />
                Save
              </button>
            )}
            {/* Clear */}
            {localMessages.length > 0 && (
              <button
                onClick={() => clearSession.mutate()}
                disabled={clearSession.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs cursor-pointer transition-opacity hover:opacity-70"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto">
        <div className="container max-w-3xl py-6 space-y-5">

          {/* Empty state */}
          {isEmpty && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full overflow-hidden mx-auto mb-5 border-2" style={{ borderColor: "rgba(201,151,58,0.4)" }}>
                <img src={ALISTAIR_AVATAR} alt="Alistair" className="w-full h-full object-cover" />
              </div>
              <h2 className="font-serif font-bold text-foreground text-xl mb-2">
                Explore your career options with Alistair
              </h2>
              <p className="text-muted-foreground text-sm max-w-md mx-auto mb-4 leading-relaxed">
                Alistair has read your full Lifework profile. Ask him about a specific career, or ask what
                suits you — he'll draw on your actual achievements, strengths, and personality.
              </p>
              {/* Upload prompt */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 text-sm mb-8 underline cursor-pointer"
                style={{ color: "var(--lw-gold)" }}
              >
                <Upload className="w-3.5 h-3.5" />
                Upload a previous conversation
              </button>
              <div className="flex flex-col gap-2 max-w-lg mx-auto">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSend(q)}
                    disabled={sendMessage.isPending}
                    className="text-left px-4 py-3 rounded-xl border border-border bg-card text-sm text-foreground hover:border-[var(--lw-gold)]/50 transition-colors cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading skeleton */}
          {(loadingSession || getOpeningMessage.isPending) && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Messages */}
          {localMessages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "client" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "advisor" && (
                <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 mr-2.5 mt-0.5" style={{ border: "1px solid rgba(201,151,58,0.4)" }}>
                  <img src={ALISTAIR_AVATAR} alt="Alistair" className="w-full h-full object-cover" />
                </div>
              )}
              {msg.role === "advisor" ? (
                <AdvisorMessageBubble content={msg.content} />
              ) : (
                <div
                  className="max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed text-white rounded-br-sm"
                  style={{ background: "var(--lw-navy)" }}
                >
                  {msg.content}
                </div>
              )}
            </div>
          ))}

          {/* Thinking indicator */}
          {sendMessage.isPending && (
            <div className="flex justify-start">
              <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 mr-2.5" style={{ border: "1px solid rgba(201,151,58,0.4)" }}>
                <img src={ALISTAIR_AVATAR} alt="Alistair" className="w-full h-full object-cover" />
              </div>
              <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input bar */}
      <div
        className="sticky bottom-0 border-t border-border"
        style={{ background: "var(--lw-cream)" }}
      >
        <div className="container max-w-3xl py-4">
          <div className="flex items-end gap-3 bg-card border border-border rounded-2xl px-4 py-3 focus-within:border-[var(--lw-gold)]/60 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Alistair about a career, or ask what suits you…"
              rows={4}
              className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none leading-relaxed"
              style={{ maxHeight: "160px", overflowY: "auto" }}
              disabled={sendMessage.isPending}
            />
            <Button
              size="sm"
              onClick={() => handleSend()}
              disabled={!input.trim() || sendMessage.isPending}
              className="flex-shrink-0 w-8 h-8 p-0 rounded-xl"
              style={{
                background: input.trim() ? "var(--lw-gold)" : undefined,
                color: input.trim() ? "white" : undefined,
              }}
            >
              {sendMessage.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Alistair has access to your full Lifework profile. Press Enter to send, Shift+Enter for a new line.
          </p>
        </div>
      </div>

      {/* ── Save dialog ──────────────────────────────────────────────────── */}
      <Dialog open={saveDialogOpen} onOpenChange={(o) => { setSaveDialogOpen(o); if (!o) { setSavePin(""); setSavePin2(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Save conversation</DialogTitle>
            <DialogDescription>
              Set a PIN to protect your conversation file. You will need this PIN to upload it again.
              The file is saved only to your device — nothing is stored on our servers.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="save-pin">PIN (4 or more digits)</Label>
              <Input
                id="save-pin"
                type="password"
                inputMode="numeric"
                placeholder="Enter PIN"
                value={savePin}
                onChange={(e) => setSavePin(e.target.value.replace(/\D/g, ""))}
                maxLength={12}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="save-pin2">Confirm PIN</Label>
              <Input
                id="save-pin2"
                type="password"
                inputMode="numeric"
                placeholder="Confirm PIN"
                value={savePin2}
                onChange={(e) => setSavePin2(e.target.value.replace(/\D/g, ""))}
                maxLength={12}
                onKeyDown={(e) => { if (e.key === "Enter") handleSaveConfirm(); }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSaveConfirm}
              disabled={savePending || savePin.length < 4 || savePin !== savePin2}
              style={{ background: "var(--lw-gold)", color: "white" }}
            >
              {savePending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
              Download file
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Upload / PIN dialog ───────────────────────────────────────────── */}
      <Dialog open={uploadDialogOpen} onOpenChange={(o) => { setUploadDialogOpen(o); if (!o) { setUploadPin(""); setPendingFile(null); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Restore conversation</DialogTitle>
            <DialogDescription>
              Enter the PIN you used when saving this conversation file.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="upload-pin">PIN</Label>
              <Input
                id="upload-pin"
                type="password"
                inputMode="numeric"
                placeholder="Enter PIN"
                value={uploadPin}
                onChange={(e) => setUploadPin(e.target.value.replace(/\D/g, ""))}
                maxLength={12}
                onKeyDown={(e) => { if (e.key === "Enter") handleUploadConfirm(); }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleUploadConfirm}
              disabled={uploadPending || uploadPin.length < 4}
              style={{ background: "var(--lw-gold)", color: "white" }}
            >
              {uploadPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
              Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
