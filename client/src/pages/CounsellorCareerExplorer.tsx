/**
 * CounsellorCareerExplorer
 *
 * Read-only view of a specific client's Alistair (Career Explorer) conversation.
 * Accessible at /counselor/client/:id/career-explorer (counsellor-only).
 */
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Compass, Loader2, MessageSquare } from "lucide-react";
import { Streamdown } from "streamdown";

const ALISTAIR_AVATAR =
  "https://d2xsxph8kpxj0f.cloudfront.net/107696804/kFbbE6kqNApXGDFpQJUGV7/alistair-avatar_24fddf8e.jpg";

type Message = {
  role: "advisor" | "client";
  content: string;
  timestamp: number;
};

function parseAdvisorMessage(content: string): { behaviour: string | null; speech: string } {
  const match = content.match(/^\[([^\]]+)\]\s*/);
  if (match) {
    const tag = match[1].trim();
    if (/^behaviour:/i.test(tag) || /^Sage\b/i.test(tag) || /^Alistair\b/i.test(tag)) {
      return {
        behaviour: tag.replace(/^behaviour:\s*/i, "").trim(),
        speech: content.slice(match[0].length).trim(),
      };
    }
  }
  return { behaviour: null, speech: content };
}

export default function CounsellorCareerExplorer() {
  const params = useParams<{ id: string }>();
  const clientId = Number(params.id);
  const [, navigate] = useLocation();

  const { data, isLoading } = trpc.careerExplorer.getClientSession.useQuery(
    { clientId },
    { enabled: !isNaN(clientId) }
  );

  const messages: Message[] = data?.messages ?? [];
  const preferredName = data?.preferredName ?? null;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--lw-cream)" }}>
      {/* Header */}
      <div
        className="sticky top-0 z-10"
        style={{ background: "var(--lw-navy)", borderBottom: "1px solid rgba(201,151,58,0.25)" }}
      >
        <div className="container flex items-center gap-3 h-14">
          <button
            onClick={() => navigate(`/counselor/client/${clientId}`)}
            className="p-1.5 cursor-pointer transition-opacity hover:opacity-70"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4" style={{ color: "var(--lw-gold)" }} />
            <span className="font-serif font-semibold" style={{ color: "white", fontSize: "1rem" }}>
              Career Explorer — Alistair's conversation{preferredName ? ` with ${preferredName}` : ""}
            </span>
          </div>
          <span
            className="ml-auto text-xs px-2 py-1 rounded-full"
            style={{ background: "rgba(201,151,58,0.15)", color: "rgba(201,151,58,0.9)", border: "1px solid rgba(201,151,58,0.3)" }}
          >
            Read-only
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="container max-w-3xl py-6 space-y-5">

          {isLoading && (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && messages.length === 0 && (
            <div className="text-center py-16">
              <div className="w-12 h-12 rounded-full overflow-hidden mx-auto mb-4 border-2" style={{ borderColor: "rgba(201,151,58,0.3)" }}>
                <img src={ALISTAIR_AVATAR} alt="Alistair" className="w-full h-full object-cover" />
              </div>
              <p className="text-muted-foreground text-sm">
                <MessageSquare className="w-4 h-4 inline mr-1.5 opacity-50" />
                No conversation yet — the client hasn't started their Career Explorer session.
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "client" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "advisor" && (
                <div
                  className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 mr-2.5 mt-0.5"
                  style={{ border: "1px solid rgba(201,151,58,0.4)" }}
                >
                  <img src={ALISTAIR_AVATAR} alt="Alistair" className="w-full h-full object-cover" />
                </div>
              )}
              {msg.role === "advisor" ? (
                (() => {
                  const { behaviour, speech } = parseAdvisorMessage(msg.content);
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
                })()
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
        </div>
      </div>

      {/* Footer */}
      {messages.length > 0 && (
        <div
          className="sticky bottom-0 border-t border-border py-3"
          style={{ background: "var(--lw-cream)" }}
        >
          <div className="container max-w-3xl flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {messages.length} message{messages.length !== 1 ? "s" : ""} in this conversation
            </p>
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={() => navigate(`/counselor/client/${clientId}`)}
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to profile
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
