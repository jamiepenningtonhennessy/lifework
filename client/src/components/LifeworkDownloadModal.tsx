import { useState } from "react";
import { X, Download, Loader2, CheckCircle } from "lucide-react";

interface LifeworkDownloadModalProps {
  open: boolean;
  onClose: () => void;
}

const NAVY = "var(--navy)";
const GOLD = "var(--gold)";
const CREAM = "var(--cream)";

export function LifeworkDownloadModal({ open, onClose }: LifeworkDownloadModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim() || !email.trim()) {
      setError("Please enter your name and email.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/download/lifework-overview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || "Something went wrong. Please try again.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "What-Lifework-Reveals.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName("");
    setEmail("");
    setDone(false);
    setError("");
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,31,53,0.82)" }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        className="relative w-full max-w-md"
        style={{ background: "white", boxShadow: "0 24px 80px rgba(0,0,0,0.35)" }}
      >
        {/* Gold top bar */}
        <div style={{ height: "3px", background: GOLD }} />

        {/* Header */}
        <div style={{ background: NAVY, padding: "1.75rem 2rem 1.5rem" }}>
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-1 opacity-50 hover:opacity-100 transition-opacity"
            style={{ color: "white" }}
          >
            <X className="w-5 h-5" />
          </button>

          <div
            className="font-medium tracking-widest uppercase mb-3"
            style={{ fontSize: "0.65rem", color: GOLD, letterSpacing: "0.18em" }}
          >
            Free Download
          </div>
          <h2
            className="font-serif font-bold"
            style={{ fontSize: "1.5rem", color: "white", lineHeight: 1.2 }}
          >
            What Lifework Reveals
          </h2>
          <p
            className="mt-2"
            style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.88rem", lineHeight: 1.6 }}
          >
            A four-page overview of the programme — what it covers, what it reveals, and what clients say.
          </p>
        </div>

        {/* Body */}
        <div style={{ padding: "2rem" }}>
          {done ? (
            <div className="text-center py-4">
              <CheckCircle className="w-12 h-12 mx-auto mb-4" style={{ color: GOLD }} />
              <h3
                className="font-serif font-semibold mb-2"
                style={{ fontSize: "1.2rem", color: NAVY }}
              >
                Your PDF is downloading
              </h3>
              <p style={{ color: "#4A5568", fontSize: "0.9rem", lineHeight: 1.6 }}>
                If the download did not start automatically, please check your browser's download bar.
              </p>
              <p className="mt-4" style={{ color: "#4A5568", fontSize: "0.88rem" }}>
                We will be in touch shortly. In the meantime, you can{" "}
                <a
                  href="/coaching"
                  style={{ color: GOLD, textDecoration: "underline" }}
                >
                  book a discovery call
                </a>
                .
              </p>
              <button
                onClick={handleClose}
                className="mt-6 px-6 py-2.5 text-sm font-medium tracking-wide"
                style={{ background: NAVY, color: "white" }}
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <p
                className="mb-5"
                style={{ color: "#4A5568", fontSize: "0.9rem", lineHeight: 1.65 }}
              >
                Enter your name and email to download the overview. We do not share your details with anyone.
              </p>

              <div className="mb-4">
                <label
                  className="block mb-1.5 font-medium"
                  style={{ fontSize: "0.8rem", color: NAVY, letterSpacing: "0.04em" }}
                >
                  Your name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sarah Mitchell"
                  className="w-full px-4 py-3 text-sm outline-none transition-colors"
                  style={{
                    border: `1px solid rgba(15,31,53,0.2)`,
                    background: CREAM,
                    color: NAVY,
                    fontSize: "0.95rem",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = GOLD)}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(15,31,53,0.2)")}
                  required
                />
              </div>

              <div className="mb-5">
                <label
                  className="block mb-1.5 font-medium"
                  style={{ fontSize: "0.8rem", color: NAVY, letterSpacing: "0.04em" }}
                >
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. sarah@example.com"
                  className="w-full px-4 py-3 text-sm outline-none transition-colors"
                  style={{
                    border: `1px solid rgba(15,31,53,0.2)`,
                    background: CREAM,
                    color: NAVY,
                    fontSize: "0.95rem",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = GOLD)}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(15,31,53,0.2)")}
                  required
                />
              </div>

              {error && (
                <p className="mb-4 text-sm" style={{ color: "#C53030" }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 font-medium tracking-widest uppercase text-sm transition-opacity hover:opacity-85 disabled:opacity-60"
                style={{
                  background: GOLD,
                  color: NAVY,
                  letterSpacing: "0.1em",
                  fontWeight: 600,
                }}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating your PDF…
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Download the Overview
                  </>
                )}
              </button>

              <p
                className="mt-4 text-center"
                style={{ color: "rgba(15,31,53,0.4)", fontSize: "0.75rem" }}
              >
                No spam. No mailing list. Just the PDF.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
