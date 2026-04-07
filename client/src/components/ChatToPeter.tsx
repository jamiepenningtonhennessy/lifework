import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, X, Send, Loader2, CheckCircle2, BookmarkCheck } from "lucide-react";
import { toast } from "sonner";

type Section = "life_history" | "career_education";

type Message = {
  role: "peter" | "client";
  content: string;
  timestamp: number;
};

interface ChatToPeterProps {
  section: Section;
  /** Label shown on the trigger button */
  buttonLabel?: string;
  /** Short description shown at the top of the chat panel */
  sectionDescription?: string;
}

/**
 * Parse a Sage message that may contain a [behaviour: ...] tag.
 * Returns { behaviour: string | null, speech: string }
 */
function parseSageMessage(content: string): { behaviour: string | null; speech: string } {
  const match = content.match(/^\[([^\]]+)\]\s*/);
  if (match) {
    const tag = match[1].trim();
    if (/^behaviour:/i.test(tag) || /^Sage\b/i.test(tag)) {
      const behaviour = tag.replace(/^behaviour:\s*/i, "").trim();
      return {
        behaviour,
        speech: content.slice(match[0].length).trim(),
      };
    }
  }
  return { behaviour: null, speech: content };
}

/** Renders a Sage message bubble, splitting out the behaviour tag if present */
function SageMessageBubble({ content }: { content: string }) {
  const { behaviour, speech } = parseSageMessage(content);
  return (
    <div className="max-w-[82%] space-y-1.5">
      {behaviour && (
        <p className="text-xs italic text-muted-foreground px-1 leading-relaxed">
          {behaviour}
        </p>
      )}
      <div className="bg-muted text-foreground rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap">
        {speech}
      </div>
    </div>
  );
}

export function ChatToPeter({
  section,
  buttonLabel = "Chat to Sage",
  sectionDescription,
}: ChatToPeterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isSummarised, setIsSummarised] = useState(false);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: sessions, refetch: refetchSessions } = trpc.chatPeter.getSession.useQuery(
    { section },
    { enabled: isOpen }
  );

  // Load existing session when panel opens
  useEffect(() => {
    if (sessions && sessions.length > 0) {
      const latest = sessions.find(s => s.section === section);
      if (latest) {
        setSessionId(latest.id);
        try {
          const msgs: Message[] = JSON.parse(latest.messages || "[]");
          setMessages(msgs);
        } catch {
          setMessages([]);
        }
        setIsSummarised(!!latest.summary);
      }
    }
  }, [sessions, section]);

  // Show save prompt after 8+ messages if not yet summarised
  useEffect(() => {
    if (messages.length >= 8 && !isSummarised) {
      setShowSavePrompt(true);
    }
  }, [messages.length, isSummarised]);

  const sendMessage = trpc.chatPeter.sendMessage.useMutation({
    onSuccess: (data) => {
      const sageMsg: Message = {
        role: "peter",
        content: data.peterResponse,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, sageMsg]);
      setSessionId(data.sessionId);
    },
    onError: () => toast.error("Failed to get a response. Please try again."),
  });

  const generateSummary = trpc.chatPeter.generateSummary.useMutation({
    onSuccess: () => {
      setIsSummarised(true);
      setShowSavePrompt(false);
      refetchSessions();
      toast.success("Conversation saved — your insights will be included in your analysis.");
    },
    onError: () => toast.error("Failed to save conversation. Please try again."),
  });

  const handleSend = () => {
    const text = inputValue.trim();
    if (!text || sendMessage.isPending) return;

    const userMsg: Message = {
      role: "client",
      content: text,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInputValue("");

    sendMessage.mutate({
      section,
      userMessage: text,
      sessionId: sessionId ?? undefined,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sendMessage.isPending]);

  // Focus textarea when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const defaultDescription = section === "life_history"
    ? "Sage has read your life history achievements. She'd like to explore them with you — reflecting back what she's noticed and asking a few questions to help you see your own pattern more clearly."
    : "Sage has read your education and career history. She'd like to explore the relationship between your formal career path and what you've actually found most rewarding.";

  // How many messages before the "Save & finish" button appears
  const MIN_MESSAGES_TO_SAVE = 4;

  return (
    <>
      {/* Trigger button */}
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        className="gap-2 border-[var(--lw-gold)]/40 text-[var(--lw-gold)] hover:bg-[var(--lw-gold-light)]/10"
      >
        <MessageCircle className="w-4 h-4" />
        {buttonLabel}
        {isSummarised && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
      </Button>

      {/* Chat panel overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:p-6 pointer-events-none">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/20 pointer-events-auto"
            onClick={() => setIsOpen(false)}
          />

          {/* Chat panel */}
          <div className="relative pointer-events-auto w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl flex flex-col"
               style={{ height: "min(640px, 88vh)" }}>

            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-[var(--lw-gold-light)]/10 rounded-t-2xl">
              <div className="w-9 h-9 rounded-full bg-[var(--lw-gold)] flex items-center justify-center text-white font-serif font-bold text-sm flex-shrink-0">
                S
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm">Sage</p>
                <p className="text-xs text-muted-foreground">Your Lifework Coach</p>
              </div>
              <div className="flex items-center gap-1">
                {/* Save & finish button — only shown when there are enough messages and not yet saved */}
                {messages.length >= MIN_MESSAGES_TO_SAVE && !isSummarised && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs h-7 px-2.5 gap-1.5 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                    onClick={() => sessionId && generateSummary.mutate({ sessionId })}
                    disabled={generateSummary.isPending}
                    title="Save this conversation to your profile — do this when you have finished chatting with Sage"
                  >
                    {generateSummary.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <BookmarkCheck className="w-3.5 h-3.5" />
                        Save &amp; finish
                      </>
                    )}
                  </Button>
                )}
                {/* Close button */}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {/* Opening description — only shown before first message */}
              {messages.length === 0 && (
                <div className="bg-[var(--lw-gold-light)]/10 border border-[var(--lw-gold)]/20 rounded-xl p-4 space-y-2">
                  <p className="text-sm text-foreground leading-relaxed">
                    {sectionDescription || defaultDescription}
                  </p>
                  <p className="text-xs text-muted-foreground italic">
                    Start by saying hello, or ask Sage what she noticed.
                  </p>
                </div>
              )}

              {/* Summarised notice */}
              {isSummarised && messages.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Conversation saved — your insights will inform your analysis report.</span>
                </div>
              )}

              {/* Save prompt banner — appears after 8 messages */}
              {showSavePrompt && !isSummarised && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                  <p className="text-xs text-amber-800 leading-relaxed">
                    <strong>You've had a good conversation with Sage.</strong> When you feel ready to wrap up, click <strong>Save &amp; finish</strong> in the top-right corner to save your insights to your profile. You can continue chatting first if you'd like.
                  </p>
                  <button
                    className="text-xs text-amber-600 underline"
                    onClick={() => setShowSavePrompt(false)}
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Message bubbles */}
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-2.5 ${msg.role === "client" ? "flex-row-reverse" : "flex-row"}`}
                >
                  {msg.role === "peter" && (
                    <div className="w-7 h-7 rounded-full bg-[var(--lw-gold)] flex items-center justify-center text-white font-serif font-bold text-xs flex-shrink-0 mt-0.5">
                      S
                    </div>
                  )}
                  {msg.role === "peter" ? (
                    <SageMessageBubble content={msg.content} />
                  ) : (
                    <div className="max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed bg-[var(--lw-gold)] text-white rounded-tr-sm">
                      {msg.content}
                    </div>
                  )}
                </div>
              ))}

              {/* Typing indicator */}
              {sendMessage.isPending && (
                <div className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-[var(--lw-gold)] flex items-center justify-center text-white font-serif font-bold text-xs flex-shrink-0 mt-0.5">
                    S
                  </div>
                  <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="px-4 pb-4 pt-2 border-t border-border/50">
              {isSummarised ? (
                /* Locked state — conversation is complete */
                <div className="flex flex-col items-center gap-2 py-2">
                  <div className="flex items-center gap-2 text-sm text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Conversation complete</span>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Your insights have been saved and will be included in your analysis.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex gap-2 items-end">
                    <Textarea
                      ref={textareaRef}
                      rows={2}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type your response… (Enter to send, Shift+Enter for new line)"
                      className="text-sm resize-none flex-1"
                      disabled={sendMessage.isPending}
                    />
                    <Button
                      size="sm"
                      className="h-[60px] w-10 p-0 bg-[var(--lw-gold)] hover:bg-[oklch(0.60 0.13 72)] flex-shrink-0"
                      onClick={handleSend}
                      disabled={!inputValue.trim() || sendMessage.isPending}
                    >
                      {sendMessage.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 text-center">
                    {messages.length >= MIN_MESSAGES_TO_SAVE
                      ? <>When you're done, click <strong>Save &amp; finish</strong> above to save your insights.</>
                      : "Your conversation is private and will only be used to inform your career analysis."}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
