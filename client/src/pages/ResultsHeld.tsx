import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { CheckCircle, Lock, ArrowRight } from "lucide-react";

/**
 * ResultsHeld — shown after completing VIA, IPIP, or Derailer assessments.
 *
 * Results are intentionally withheld until the Wow report coaching session.
 * This prevents clients from forming shallow self-narratives before the
 * Life History context has been explored with their practitioner.
 */
export default function ResultsHeld({ assessmentName }: { assessmentName: string }) {
  const [, navigate] = useLocation();

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--lw-cream)" }}
    >
      <div className="max-w-lg w-full text-center space-y-8">
        {/* Icon */}
        <div className="flex justify-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ background: "var(--lw-navy)" }}
          >
            <CheckCircle className="w-10 h-10" style={{ color: "var(--lw-gold)" }} />
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-3">
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{ color: "var(--lw-navy)" }}
          >
            {assessmentName} Complete
          </h1>
          <p className="text-lg" style={{ color: "var(--lw-navy-mid)" }}>
            Thank you — your responses have been saved.
          </p>
        </div>

        {/* Held-results message */}
        <div
          className="rounded-xl p-6 text-left space-y-3"
          style={{ background: "var(--lw-navy)", color: "var(--lw-cream)" }}
        >
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "var(--lw-gold)" }} />
            <div className="space-y-2">
              <p className="font-semibold text-base">
                Your results will be shared in your Wow Report session
              </p>
              <p className="text-sm opacity-80 leading-relaxed">
                Your {assessmentName} results are held securely and will be presented
                to you by your practitioner as part of your Lifework Wow Report — alongside
                your Life History and other assessments. This ensures your results are
                always understood in context, not in isolation.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="space-y-3">
          <Button
            onClick={() => navigate("/dashboard")}
            className="w-full gap-2 text-base py-6"
            style={{ background: "var(--lw-gold)", color: "white" }}
          >
            Return to Dashboard <ArrowRight className="w-5 h-5" />
          </Button>
          <p className="text-sm" style={{ color: "var(--lw-navy-mid)" }}>
            Continue with the remaining steps in your dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}
