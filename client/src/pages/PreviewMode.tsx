import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Eye,
  MessageSquare,
  User,
  BookOpen,
  BarChart2,
  Brain,
  FileText,
  Compass,
  Home,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

const PAGES = [
  {
    label: "Client Dashboard",
    path: "/preview/dashboard",
    icon: Home,
    description: "Progress tracker, step status, navigation hub",
    status: "complete",
  },
  {
    label: "Life History Interview",
    path: "/preview/interview",
    icon: MessageSquare,
    description: "Sage 1 chat interface, achievement list, decade tabs",
    status: "complete",
  },
  {
    label: "Background & History",
    path: "/preview/background",
    icon: User,
    description: "Intro video, family / education / career tabs",
    status: "complete",
  },
  {
    label: "VIA Character Strengths Survey",
    path: "/preview/via",
    icon: BookOpen,
    description: "Survey landing page (before completion)",
    status: "complete",
  },
  {
    label: "VIA Results",
    path: "/preview/via/results",
    icon: BarChart2,
    description: "Ranked strengths, virtue categories, score bars",
    status: "complete",
  },
  {
    label: "Personality Survey (IPIP)",
    path: "/preview/ipip-survey",
    icon: Brain,
    description: "Survey landing page (before completion)",
    status: "complete",
  },
  {
    label: "IPIP Results",
    path: "/preview/ipip-results",
    icon: Brain,
    description: "Big Five domains, 30 facets, Insights mapping",
    status: "complete",
  },
  {
    label: "My Report",
    path: "/preview/my-report",
    icon: FileText,
    description: "Full WOW Report rendered in-browser, PDF export button",
    status: "complete",
  },
  {
    label: "Career Explorer (Sage 2)",
    path: "/preview/career-explorer",
    icon: Compass,
    description: "Sage 2 chat interface with sample conversation",
    status: "complete",
  },
  {
    label: "Sage — Life History Coach",
    path: "/preview/sage",
    icon: Sparkles,
    description: "Sage 1 chat panel — first-visit state, opening message, input ready",
    status: "complete",
  },
];

export default function PreviewMode() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/counselor")}
              className="gap-1"
            >
              <ArrowLeft className="w-4 h-4" /> Counsellor Dashboard
            </Button>
            <div className="w-px h-5 bg-border" />
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              <span className="font-semibold text-foreground">Client Preview Mode</span>
            </div>
          </div>
          <Badge variant="outline" className="text-xs border-primary/40 text-primary">
            Dummy Data — Alex Morgan
          </Badge>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Intro */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">Client Journey Preview</h1>
          <p className="text-muted-foreground max-w-2xl">
            Every client-facing page rendered with a realistic fictional client — Alex Morgan, a
            Legal Director considering a move to General Counsel or legal education. No login
            required. Changes to layout, copy, and styling are immediately visible here.
          </p>
        </div>

        {/* Page grid */}
        <div className="grid gap-3">
          {PAGES.map((page) => {
            const Icon = page.icon;
            return (
              <Card
                key={page.path}
                className="cursor-pointer hover:border-primary/50 transition-colors group"
                onClick={() => navigate(page.path)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-foreground">{page.label}</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{page.description}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="flex-shrink-0 gap-1 text-primary">
                    Preview <Eye className="w-3.5 h-3.5" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Note */}
        <div className="mt-8 p-4 rounded-lg border border-border bg-muted/30">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Note:</strong> All data shown is fictional. Mutations
            (save, submit, send message) are disabled in preview mode — buttons are visible but
            non-functional to show the real UI without side effects. The PDF export button on the
            Report page will attempt to generate a real PDF using the dummy data.
          </p>
        </div>
      </div>
    </div>
  );
}
