import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Send, Trash2, Compass, Lock } from "lucide-react";
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

const SUGGESTED_QUESTIONS = [
  "What careers suit me based on my profile?",
  "I'm thinking of becoming a parliamentary researcher — how do my skills match up?",
  "What roles would make the most of my VIA strengths?",
  "What should I do to break into journalism?",
  "How do my life history themes point toward a career direction?",
];

/**
 * Parse an Alistair message that may contain a [behaviour: ...] or [Alistair ...] tag.
 * Returns { behaviour: string | null, speech: string }
 */
function parseAdvisorMessage(content: string): { behaviour: string | null; speech: string } {
  // Match [behaviour: ...] or [Alistair ...] or [Sage ...] patterns at the start of the message
  const match = content.match(/^\[([^\]]+)\]\s*/);
  if (match) {
    const tag = match[1].trim();
    // Only treat as a behaviour tag if it starts with "behaviour:", "Sage", or "Alistair"
    if (/^behaviour:/i.test(tag) || /^Sage\b/i.test(tag) || /^Alistair\b/i.test(tag)) {
      const behaviour = tag.replace(/^behaviour:\s*/i, "").trim();
      return {
        behaviour,
        speech: content.slice(match[0].length).trim(),
      };
    }
  }
  return { behaviour: null, speech: content };
}

/** Renders an Alistair message bubble, splitting out the behaviour tag if present */
function AdvisorMessageBubble({ content }: { content: string }) {
  const { behaviour, speech } = parseAdvisorMessage(content);
  return (
    <div className="max-w-[80%] space-y-1.5">
      {behaviour && (
        <p className="text-xs italic text-muted-foreground px-1 leading-relaxed">
          {behaviour}
        </p>
      )}
      <div className="bg-card border border-border text-foreground rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed">
        <Streamdown>{speech}</Streamdown>
      </div>
    </div>
  );
}

export default function CareerExplorer() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [input, setInput] = useState("");
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [initialised, setInitialised] = useState(false);
  const [openingInjected, setOpeningInjected] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
      setInitialised(true);
      // If session is brand new (no messages), inject the opening
      if ((sessionData.messages as Message[]).length === 0 && !openingInjected) {
        setOpeningInjected(true);
        getOpeningMessage.mutate();
      }
    }
  }, [sessionData, initialised]);

  // Also inject opening if session was just created (sessionData not yet loaded but profile is unlocked)
  useEffect(() => {
    if (
      isAuthenticated &&
      profile?.careerExplorerUnlocked &&
      !loadingSession &&
      sessionData === undefined &&
      !openingInjected &&
      !initialised
    ) {
      // No session exists yet — will be created on first mutation
    }
  }, [isAuthenticated, profile, loadingSession, sessionData, openingInjected, initialised]);

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
      // Remove the optimistic user message
      setLocalMessages((prev) => prev.slice(0, -1));
    },
  });

  const clearSession = trpc.careerExplorer.clearSession.useMutation({
    onSuccess: () => {
      setLocalMessages([]);
      setSessionId(null);
      setInitialised(false);
      setOpeningInjected(false);
      toast.success("Conversation cleared");
    },
  });

  const handleSend = (text?: string) => {
    const message = (text ?? input).trim();
    if (!message || sendMessage.isPending) return;

    // Optimistic update
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

  if (!loading && !isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  // Show locked state if counsellor hasn't unlocked Career Explorer yet
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

  // Show empty state only when session is truly empty and opening hasn't been injected yet
  const isEmpty = localMessages.length === 0 && !loadingSession && !getOpeningMessage.isPending;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--lw-cream)" }}>
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
              <span
                className="font-serif font-semibold"
                style={{ color: "white", fontSize: "1rem" }}
              >
                Career Explorer — with Alistair
              </span>
            </div>
          </div>
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

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto">
        <div className="container max-w-3xl py-6 space-y-5">

          {/* Empty state — only shown when session is truly empty and opening hasn't fired */}
          {isEmpty && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full overflow-hidden mx-auto mb-5 border-2" style={{ borderColor: "rgba(201,151,58,0.4)" }}>
                <img src={ALISTAIR_AVATAR} alt="Alistair" className="w-full h-full object-cover" />
              </div>
              <h2 className="font-serif font-bold text-foreground text-xl mb-2">
                Explore your career options with Alistair
              </h2>
              <p className="text-muted-foreground text-sm max-w-md mx-auto mb-8 leading-relaxed">
                Alistair has read your full Lifework profile. Ask him about a specific career, or ask what
                suits you — he'll draw on your actual achievements, strengths, and personality.
              </p>
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
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none leading-relaxed"
              style={{ maxHeight: "120px", overflowY: "auto" }}
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
    </div>
  );
}
