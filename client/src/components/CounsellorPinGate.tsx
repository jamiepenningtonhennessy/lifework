import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";

interface Props {
  children: React.ReactNode;
}

/**
 * CounsellorPinGate
 *
 * Wraps any counsellor-only view. Before rendering children it checks:
 *  1. Whether a PIN has been set. If not, shows a "Set your PIN" form.
 *  2. Whether the user has entered the correct PIN this session.
 *     The verified state is kept in sessionStorage so it survives React
 *     re-renders but is cleared when the browser tab is closed.
 */
export function CounsellorPinGate({ children }: Props) {
  const SESSION_KEY = "counsellor_pin_verified";

  const [verified, setVerified] = useState(() => {
    try {
      return sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      return false;
    }
  });

  const [pin, setPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"loading" | "verify" | "setup" | "granted">("loading");
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: hasPinData, isLoading } = trpc.pin.hasPin.useQuery(undefined, {
    retry: false,
  });

  const verifyMutation = trpc.pin.verify.useMutation({
    onSuccess: () => {
      try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* ignore */ }
      setVerified(true);
      setMode("granted");
    },
    onError: (err) => {
      setError(err.message === "Incorrect PIN" ? "Incorrect PIN. Please try again." : err.message);
      setPin("");
      inputRef.current?.focus();
    },
  });

  const setPinMutation = trpc.pin.setPin.useMutation({
    onSuccess: () => {
      try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* ignore */ }
      setVerified(true);
      setMode("granted");
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  useEffect(() => {
    if (verified) { setMode("granted"); return; }
    if (isLoading) return;
    setMode(hasPinData?.hasPin ? "verify" : "setup");
  }, [verified, isLoading, hasPinData]);

  useEffect(() => {
    if (mode === "verify" || mode === "setup") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [mode]);

  if (mode === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--lw-navy, #0a1628)" }}>
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--lw-gold, #c9973a)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (mode === "granted") {
    return <>{children}</>;
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--lw-navy, #0a1628)" }}
    >
      <div
        className="w-full max-w-sm rounded-xl p-8"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,151,58,0.2)" }}
      >
        {/* Logo mark */}
        <div className="mb-8 text-center">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-4"
            style={{ background: "rgba(201,151,58,0.12)", border: "1px solid rgba(201,151,58,0.3)" }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--lw-gold, #c9973a)" }}>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 className="font-light tracking-wide" style={{ fontSize: "1.1rem", color: "#fff" }}>
            {mode === "setup" ? "Set Counsellor PIN" : "Counsellor Access"}
          </h1>
          <p className="mt-1" style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)" }}>
            {mode === "setup"
              ? "Create a PIN to protect the counsellor dashboard."
              : "Enter your PIN to continue."}
          </p>
        </div>

        {mode === "verify" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (pin.length < 4) { setError("PIN must be at least 4 digits."); return; }
              setError("");
              verifyMutation.mutate({ pin });
            }}
          >
            <PinInput
              ref={inputRef}
              value={pin}
              onChange={(v) => { setPin(v); setError(""); }}
              placeholder="Enter PIN"
            />
            {error && <p className="mt-2 text-center" style={{ fontSize: "0.8rem", color: "#f87171" }}>{error}</p>}
            <button
              type="submit"
              disabled={verifyMutation.isPending || pin.length < 4}
              className="mt-5 w-full py-2.5 rounded-lg font-medium tracking-widest uppercase transition-opacity disabled:opacity-40"
              style={{ background: "var(--lw-gold, #c9973a)", color: "#0a1628", fontSize: "0.78rem", letterSpacing: "0.1em" }}
            >
              {verifyMutation.isPending ? "Checking…" : "Unlock"}
            </button>
          </form>
        )}

        {mode === "setup" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newPin.length < 4) { setError("PIN must be at least 4 characters."); return; }
              if (newPin !== confirmPin) { setError("PINs do not match."); return; }
              setError("");
              setPinMutation.mutate({ pin: newPin });
            }}
          >
            <div className="space-y-3">
              <PinInput
                ref={inputRef}
                value={newPin}
                onChange={(v) => { setNewPin(v); setError(""); }}
                placeholder="Choose a PIN (4–12 characters)"
              />
              <PinInput
                value={confirmPin}
                onChange={(v) => { setConfirmPin(v); setError(""); }}
                placeholder="Confirm PIN"
              />
            </div>
            {error && <p className="mt-2 text-center" style={{ fontSize: "0.8rem", color: "#f87171" }}>{error}</p>}
            <button
              type="submit"
              disabled={setPinMutation.isPending || newPin.length < 4 || newPin !== confirmPin}
              className="mt-5 w-full py-2.5 rounded-lg font-medium tracking-widest uppercase transition-opacity disabled:opacity-40"
              style={{ background: "var(--lw-gold, #c9973a)", color: "#0a1628", fontSize: "0.78rem", letterSpacing: "0.1em" }}
            >
              {setPinMutation.isPending ? "Saving…" : "Set PIN & Continue"}
            </button>
            <p className="mt-4 text-center" style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.3)" }}>
              You can change your PIN at any time from the counsellor settings.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

/* ── PIN input field ── */
const PinInput = ({
  value,
  onChange,
  placeholder,
  ref,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  ref?: React.Ref<HTMLInputElement>;
}) => (
  <input
    ref={ref}
    type="password"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    autoComplete="off"
    className="w-full rounded-lg px-4 py-3 text-center tracking-widest outline-none transition-colors"
    style={{
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(201,151,58,0.2)",
      color: "#fff",
      fontSize: "1.1rem",
      letterSpacing: "0.3em",
    }}
    onFocus={(e) => (e.target.style.borderColor = "rgba(201,151,58,0.6)")}
    onBlur={(e) => (e.target.style.borderColor = "rgba(201,151,58,0.2)")}
  />
);
