import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Send, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";

const PHASES = [
  { id: "childhood", label: "Childhood" },
  { id: "teens", label: "Teens" },
  { id: "twenties", label: "20s" },
  { id: "thirties", label: "30s" },
  { id: "forties", label: "40s" },
  { id: "fifties_plus", label: "50s+" },
];

export default function Interview() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [currentPhase, setCurrentPhase] = useState("childhood");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  const { data: messages = [], isLoading: loadingMessages } = trpc.interview.getMessages.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const sendMessage = trpc.interview.sendMessage.useMutation({
    onSuccess: () => {
      utils.interview.getMessages.invalidate();
      setInput("");
      setIsSending(false);
    },
    onError: () => {
      setIsSending(false);
      toast.error("Failed to send message. Please try again.");
    },
  });

  const completeInterview = trpc.interview.completeInterview.useMutation({
    onSuccess: () => {
      toast.success("Interview marked as complete!");
      navigate("/background");
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-start: if no messages, send an empty trigger
  useEffect(() => {
    if (!isAuthenticated || loadingMessages) return;
    if (messages.length === 0 && !isSending) {
      setIsSending(true);
      sendMessage.mutate({
        content: "Hello, I'm ready to begin.",
        phase: currentPhase,
      });
    }
  }, [isAuthenticated, loadingMessages, messages.length]);

  if (!loading && !isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  const handleSend = () => {
    if (!input.trim() || isSending) return;
    setIsSending(true);
    sendMessage.mutate({ content: input.trim(), phase: currentPhase });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
            </Button>
            <div className="h-4 w-px bg-border" />
            <span className="font-serif font-semibold text-foreground">Life History Interview</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => completeInterview.mutate()}
            className="gap-1 text-xs"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Mark Complete
          </Button>
        </div>
      </div>

      {/* Phase selector */}
      <div className="border-b border-border bg-background">
        <div className="container">
          <div className="flex gap-1 py-2 overflow-x-auto">
            {PHASES.map((phase) => (
              <button
                key={phase.id}
                onClick={() => setCurrentPhase(phase.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  currentPhase === phase.id
                    ? "bg-[var(--plum)] text-white"
                    : "bg-muted text-muted-foreground hover:bg-secondary"
                }`}
              >
                {phase.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="container max-w-3xl py-6 space-y-4">
          {loadingMessages ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-[var(--plum)] flex items-center justify-center text-white text-xs font-bold mr-2 mt-1 flex-shrink-0">
                    PT
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[var(--plum)] text-white rounded-tr-sm"
                      : "bg-card border border-border text-foreground rounded-tl-sm"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <Streamdown>{msg.content}</Streamdown>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))
          )}
          {isSending && (
            <div className="flex justify-start">
              <div className="w-7 h-7 rounded-full bg-[var(--plum)] flex items-center justify-center text-white text-xs font-bold mr-2 mt-1 flex-shrink-0">
                PT
              </div>
              <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1 items-center h-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card/80 backdrop-blur-sm">
        <div className="container max-w-3xl py-4">
          <div className="flex gap-2 items-end">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Share your story… (Enter to send, Shift+Enter for new line)"
              className="resize-none min-h-[52px] max-h-32 bg-background"
              rows={2}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isSending}
              size="icon"
              className="h-[52px] w-[52px] flex-shrink-0 bg-[var(--plum)] hover:bg-[var(--plum-dark)]"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            This is a safe, confidential space. Share as much or as little as you feel comfortable with.
          </p>
        </div>
      </div>
    </div>
  );
}
