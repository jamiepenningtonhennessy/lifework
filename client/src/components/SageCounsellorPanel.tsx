/**
 * SageCounsellorPanel
 *
 * A slide-over chat panel that gives counsellors access to Sage as a
 * thinking partner before a client meeting. Sage is pre-loaded with the
 * full client context (life history, VIA, Big Five, WOW Report sections).
 *
 * The conversation is ephemeral — it lives in component state only and
 * is not persisted to the database.
 */

import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Loader2,
  Send,
  Sparkles,
  X,
  RotateCcw,
  MessageSquare,
} from "lucide-react";
import { Streamdown } from "streamdown";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface SageCounsellorPanelProps {
  clientId: number;
  clientName?: string;
  open: boolean;
  onClose: () => void;
}

export default function SageCounsellorPanel({
  clientId,
  clientName,
  open,
  onClose,
}: SageCounsellorPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch the opening briefing when the panel first opens
  const { data: briefingData, isLoading: briefingLoading } =
    trpc.counsellorSage.getBriefing.useQuery(
      { clientId },
      {
        enabled: open,
        refetchOnWindowFocus: false,
        staleTime: Infinity, // Don't re-fetch — briefing is session-scoped
      }
    );

  const chatMutation = trpc.counsellorSage.chat.useMutation();

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, briefingLoading]);

  // Focus textarea when panel opens
  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 300);
    }
  }, [open]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isSending) return;

    const userMessage: Message = { role: "user", content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsSending(true);

    try {
      const result = await chatMutation.mutateAsync({
        clientId,
        messages: updatedMessages.slice(0, -1), // history before this message
        newMessage: text,
      });
      setMessages([...updatedMessages, { role: "assistant", content: result.reply }]);
    } catch (err) {
      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: "I'm sorry — something went wrong. Please try again.",
        },
      ]);
    } finally {
      setIsSending(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReset = () => {
    setMessages([]);
    setInput("");
  };

  const displayName = clientName ?? "this client";

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent
        side="right"
        className="w-full sm:w-[520px] sm:max-w-[520px] p-0 flex flex-col bg-[var(--lw-navy)] border-l border-white/10"
      >
        {/* Header */}
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "var(--lw-gold)" }}
              >
                <Sparkles className="w-4 h-4 text-[var(--lw-navy)]" />
              </div>
              <div>
                <SheetTitle className="text-white text-base font-semibold leading-tight">
                  Consult Sage
                </SheetTitle>
                <p className="text-xs text-white/40 mt-0.5">
                  Pre-session thinking partner for{" "}
                  <span className="text-white/60">{displayName}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white/40 hover:text-white/70 hover:bg-white/5 h-8 px-2"
                  onClick={handleReset}
                  title="Clear conversation"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="text-white/40 hover:text-white/70 hover:bg-white/5 h-8 px-2"
                onClick={onClose}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        {/* Messages area */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <ScrollArea className="flex-1 px-5 py-4" ref={scrollRef as any}>
            <div className="space-y-4 pb-2">

              {/* Opening briefing */}
              {briefingLoading && (
                <div className="flex items-center gap-2 text-sm text-white/40 py-2">
                  <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" style={{ color: "var(--lw-gold)" }} />
                  <span>Reading {displayName}'s file…</span>
                </div>
              )}

              {briefingData?.briefing && messages.length === 0 && (
                <div className="rounded-lg p-4 text-sm" style={{ backgroundColor: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.2)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--lw-gold)" }} />
                    <span className="text-xs font-semibold tracking-wide uppercase" style={{ color: "var(--lw-gold)" }}>
                      Pre-session briefing
                    </span>
                  </div>
                  <div className="text-white/80 leading-relaxed">
                    <Streamdown>{briefingData.briefing}</Streamdown>
                  </div>
                  <p className="text-xs text-white/30 mt-3">
                    Ask me anything about {displayName}'s profile, or float an idea you want to test.
                  </p>
                </div>
              )}

              {/* Empty state (after reset) */}
              {!briefingLoading && messages.length === 0 && !briefingData?.briefing && (
                <div className="text-center py-8">
                  <MessageSquare className="w-8 h-8 mx-auto mb-3 text-white/20" />
                  <p className="text-sm text-white/40">
                    Ask me anything about {displayName}'s profile.
                  </p>
                </div>
              )}

              {/* Conversation */}
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-0.5"
                      style={{ backgroundColor: "var(--lw-gold)" }}
                    >
                      <Sparkles className="w-3 h-3 text-[var(--lw-navy)]" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-lg px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-white/10 text-white/90 rounded-br-sm"
                        : "bg-white/5 text-white/85 rounded-bl-sm"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <Streamdown>{msg.content}</Streamdown>
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              ))}

              {/* Sending indicator */}
              {isSending && (
                <div className="flex justify-start">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-0.5"
                    style={{ backgroundColor: "var(--lw-gold)" }}
                  >
                    <Sparkles className="w-3 h-3 text-[var(--lw-navy)]" />
                  </div>
                  <div className="bg-white/5 rounded-lg rounded-bl-sm px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input area */}
          <div className="px-5 pb-5 pt-3 border-t border-white/10 flex-shrink-0">
            <div className="flex gap-2 items-end">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Ask about ${displayName}… (Enter to send, Shift+Enter for new line)`}
                className="flex-1 min-h-[60px] max-h-[140px] resize-none bg-white/5 border-white/15 text-white placeholder:text-white/25 text-sm focus-visible:ring-1 focus-visible:ring-[var(--lw-gold)]/50"
                disabled={isSending || briefingLoading}
              />
              <Button
                size="icon"
                className="h-10 w-10 flex-shrink-0 mb-0.5"
                style={{ backgroundColor: "var(--lw-gold)" }}
                onClick={handleSend}
                disabled={!input.trim() || isSending || briefingLoading}
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[var(--lw-navy)]" />
                ) : (
                  <Send className="w-4 h-4 text-[var(--lw-navy)]" />
                )}
              </Button>
            </div>
            <p className="text-xs text-white/20 mt-2">
              Conversation is not saved. Sage has read {displayName}'s full profile and WOW Report.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
