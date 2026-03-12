import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, X, Send, Loader2, RefreshCw, CheckCircle2 } from "lucide-react";
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

export function ChatToPeter({
  section,
  buttonLabel = "Chat to Peter",
  sectionDescription,
}: ChatToPeterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isSummarised, setIsSummarised] = useState(false);
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

  const sendMessage = trpc.chatPeter.sendMessage.useMutation({
    onSuccess: (data) => {
      const peterMsg: Message = {
        role: "peter",
        content: data.peterResponse,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, peterMsg]);
      setSessionId(data.sessionId);
    },
    onError: () => toast.error("Failed to get a response. Please try again."),
  });

  const generateSummary = trpc.chatPeter.generateSummary.useMutation({
    onSuccess: (data) => {
      setIsSummarised(true);
      toast.success("Conversation summarised — this will be included in your analysis.");
    },
    onError: () => toast.error("Failed to generate summary."),
  });

  const resetSession = trpc.chatPeter.resetSession.useMutation({
    onSuccess: (data) => {
      setSessionId(data.sessionId);
      setMessages([]);
      setIsSummarised(false);
      refetchSessions();
      toast.success("Started a new conversation.");
    },
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
    ? "Peter has read your life history achievements. He'd like to explore them with you — reflecting back what he's noticed and asking a few questions to help you see your own pattern more clearly."
    : "Peter has read your education and career history. He'd like to explore the relationship between your formal career path and what you've actually found rewarding.";

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
               style={{ height: "min(600px, 85vh)" }}>

            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-[var(--lw-gold-light)]/10 rounded-t-2xl">
              <div className="w-9 h-9 rounded-full bg-[var(--lw-gold)] flex items-center justify-center text-white font-serif font-bold text-sm flex-shrink-0">
                J
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm">Jamie</p>
                <p className="text-xs text-muted-foreground">Your Lifework Counsellor</p>
              </div>
              <div className="flex items-center gap-1">
                {messages.length >= 4 && !isSummarised && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
                    onClick={() => sessionId && generateSummary.mutate({ sessionId })}
                    disabled={generateSummary.isPending}
                    title="Save conversation insights to your profile"
                  >
                    {generateSummary.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      "Save insights"
                    )}
                  </Button>
                )}
                {messages.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => resetSession.mutate({ section })}
                    disabled={resetSession.isPending}
                    title="Start a new conversation"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </Button>
                )}
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
                    Start by saying hello, or ask Peter what he noticed.
                  </p>
                </div>
              )}

              {/* Summarised notice */}
              {isSummarised && messages.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Conversation insights saved — they will inform your analysis report.</span>
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
                      P
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      msg.role === "peter"
                        ? "bg-muted text-foreground rounded-tl-sm"
                        : "bg-[var(--lw-gold)] text-white rounded-tr-sm"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {sendMessage.isPending && (
                <div className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-[var(--lw-gold)] flex items-center justify-center text-white font-serif font-bold text-xs flex-shrink-0 mt-0.5">
                    P
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
                {messages.length >= 4 && !isSummarised
                  ? <>You can tell Peter you’re ready to wrap up, or click <strong>Save insights</strong> when you’re done. This conversation will be included in your analysis.</>
                  : "Your conversation is private and will only be used to inform your career analysis."}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
