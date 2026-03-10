import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { ArrowRight, BookOpen, Brain, Star, Users } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { data: profile } = trpc.profile.getMyProfile.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const handleStart = () => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
    } else {
      navigate("/dashboard");
    }
  };

  const handleCounselor = () => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
    } else {
      navigate("/counselor");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[var(--plum)] flex items-center justify-center">
              <span className="text-white text-sm font-bold">PT</span>
            </div>
            <span className="font-serif font-semibold text-lg text-foreground">Plum Trees</span>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-muted-foreground hidden sm:block">
                  Welcome, {user?.name?.split(" ")[0]}
                </span>
                {user?.role === "admin" && (
                  <Button variant="outline" size="sm" onClick={() => navigate("/counselor")}>
                    Counselor View
                  </Button>
                )}
                <Button size="sm" onClick={() => navigate("/dashboard")}>
                  My Dashboard
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => window.location.href = getLoginUrl()}>
                Sign In
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--plum-light)] via-background to-[var(--gold-light)] opacity-60" />
        <div className="container relative py-24 lg:py-32">
          <div className="max-w-3xl">
            <p className="text-sm font-medium text-[var(--plum)] uppercase tracking-widest mb-4">
              Career Analysis
            </p>
            <h1 className="text-5xl lg:text-6xl font-serif font-bold text-foreground leading-tight mb-6">
              Discover the story<br />
              <em className="text-[var(--plum)]">your life is telling.</em>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-2xl">
              Plum Trees guides you through a reflective journey of your life history — your achievements, 
              your strengths, your values — to reveal the career that is authentically yours. 
              Based on the pioneering methodology of career analyst Peter Daws.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="lg" onClick={handleStart} className="gap-2 bg-[var(--plum)] hover:bg-[var(--plum-dark)] text-white">
                Begin Your Journey <ArrowRight className="w-4 h-4" />
              </Button>
              {(!isAuthenticated || user?.role === "admin") && (
                <Button size="lg" variant="outline" onClick={handleCounselor}>
                  Counselor Access
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-card border-y border-border">
        <div className="container">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-serif font-bold text-foreground mb-3">How it works</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              A three-stage process that reveals the career that is authentically yours.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                icon: <BookOpen className="w-6 h-6" />,
                step: "01",
                title: "Life History Interview",
                desc: "A structured conversation explores your achievements decade by decade — childhood through to today.",
              },
              {
                icon: <Star className="w-6 h-6" />,
                step: "02",
                title: "Psychometric Instruments",
                desc: "A small set of validated assessments that act as lenses through which we consider the you that your life shows.",
              },
              {
                icon: <Brain className="w-6 h-6" />,
                step: "03",
                title: "Analysis & Report",
                desc: "Your counsellor will take all the information given and write a summary report, setting out what he believes may be true, and setting out some questions to explore together.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="relative p-6 rounded-xl border border-border bg-background hover:shadow-md transition-shadow"
              >
                <div className="absolute top-4 right-4 text-3xl font-serif font-bold text-border">
                  {item.step}
                </div>
                <div className="w-10 h-10 rounded-lg bg-[var(--plum-light)] flex items-center justify-center text-[var(--plum)] mb-4">
                  {item.icon}
                </div>
                <h3 className="font-serif font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quote */}
      <section className="py-20">
        <div className="container max-w-3xl text-center">
          <blockquote className="text-2xl font-serif italic text-foreground leading-relaxed mb-6">
            "The most important thing is to find out what is important to you — not what others think should be important."
          </blockquote>
          <p className="text-muted-foreground text-sm">— Peter Daws, Career Analyst (1982–2017)</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[var(--plum)] flex items-center justify-center">
              <span className="text-white text-xs font-bold">PT</span>
            </div>
            <span className="text-sm text-muted-foreground">Plum Trees Career Analysis</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Inspired by the work of Peter Daws
          </p>
        </div>
      </footer>
    </div>
  );
}
