import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Interview from "./pages/Interview";
import VIASurvey from "./pages/VIASurvey";
import VIAResults from "./pages/VIAResults";
import ClientDashboard from "./pages/ClientDashboard";
import CounselorDashboard from "./pages/CounselorDashboard";
import ClientProfile from "./pages/ClientProfile";
import Background from "./pages/Background";
import IpipSurvey from "./pages/IpipSurvey";
import IpipResults from "./pages/IpipResults";
import MyReport from "./pages/MyReport";
import CareerExplorer from "./pages/CareerExplorer";
import AICoaching from "./pages/AICoaching";
import PHHome from "./pages/ph/PHHome";
import PHCoaching from "./pages/ph/PHCoaching";
import PHTraining from "./pages/ph/PHTraining";
import PHAbout from "./pages/ph/PHAbout";
import PreviewMode from "./pages/PreviewMode";
import LifeworkLanding from "./pages/LifeworkLanding";
import ResultsHeld from "./pages/ResultsHeld";
import { InstallPrompt } from "./components/InstallPrompt";
import { LifeworkLayout } from "./components/LifeworkLayout";
import {
  PreviewClientDashboard,
  PreviewInterview,
  PreviewBackground,
  PreviewVIASurvey,
  PreviewVIAResults,
  PreviewHome,
  PreviewIpipSurvey,
  PreviewIpipResults,
  PreviewMyReport,
  PreviewCareerExplorer,
  PreviewSage,
} from "./preview/PreviewPages";

function Router() {
  return (
    <Switch>
      {/* ── Pennington Hennessy marketing site (root) ── */}
      <Route path="/" component={PHHome} />
      <Route path="/coaching" component={PHCoaching} />
      <Route path="/training" component={PHTraining} />
      <Route path="/about" component={PHAbout} />
      <Route path="/ai-coaching" component={AICoaching} />

      {/* ── Lifework StoryBrand landing page ── */}
      <Route path="/lifework-landing" component={LifeworkLanding} />

      {/* Results held — shown after completing VIA or IPIP (withheld until Wow Report session) ── */}
      <Route path="/results-held/via">{() => <LifeworkLayout><ResultsHeld assessmentName="VIA Character Strengths" /></LifeworkLayout>}</Route>
      <Route path="/results-held/ipip">{() => <LifeworkLayout><ResultsHeld assessmentName="Personality Profile" /></LifeworkLayout>}</Route>
      <Route path="/coaching/lifework/results-held/via">{() => <LifeworkLayout><ResultsHeld assessmentName="VIA Character Strengths" /></LifeworkLayout>}</Route>
      <Route path="/coaching/lifework/results-held/ipip">{() => <LifeworkLayout><ResultsHeld assessmentName="Personality Profile" /></LifeworkLayout>}</Route>

      {/* ── Lifework app (under /coaching/lifework) ── */}
      <Route path="/coaching/lifework">{() => <LifeworkLayout><Home /></LifeworkLayout>}</Route>
      <Route path="/coaching/lifework/interview">{() => <LifeworkLayout><Interview /></LifeworkLayout>}</Route>
      <Route path="/coaching/lifework/background">{() => <LifeworkLayout><Background /></LifeworkLayout>}</Route>
      <Route path="/coaching/lifework/via">{() => <LifeworkLayout><VIASurvey /></LifeworkLayout>}</Route>
      <Route path="/coaching/lifework/via/results">{() => <LifeworkLayout><VIAResults /></LifeworkLayout>}</Route>
      <Route path="/coaching/lifework/ipip-survey">{() => <LifeworkLayout><IpipSurvey /></LifeworkLayout>}</Route>
      <Route path="/coaching/lifework/ipip-results">{() => <LifeworkLayout><IpipResults /></LifeworkLayout>}</Route>
      <Route path="/coaching/lifework/ipip/results">{() => <LifeworkLayout><IpipResults /></LifeworkLayout>}</Route>
      <Route path="/coaching/lifework/my-report">{() => <LifeworkLayout><MyReport /></LifeworkLayout>}</Route>
      <Route path="/coaching/lifework/career-explorer">{() => <LifeworkLayout><CareerExplorer /></LifeworkLayout>}</Route>

      {/* Backward-compatible redirects from old /lifework/* paths */}
      <Route path="/lifework"><Redirect to="/coaching/lifework" /></Route>
      <Route path="/lifework/interview"><Redirect to="/coaching/lifework/interview" /></Route>
      <Route path="/lifework/background"><Redirect to="/coaching/lifework/background" /></Route>
      <Route path="/lifework/via"><Redirect to="/coaching/lifework/via" /></Route>
      <Route path="/lifework/via/results"><Redirect to="/coaching/lifework/via/results" /></Route>
      <Route path="/lifework/ipip-survey"><Redirect to="/coaching/lifework/ipip-survey" /></Route>
      <Route path="/lifework/ipip-results"><Redirect to="/coaching/lifework/ipip-results" /></Route>
      <Route path="/lifework/my-report"><Redirect to="/coaching/lifework/my-report" /></Route>
      <Route path="/lifework/career-explorer"><Redirect to="/coaching/lifework/career-explorer" /></Route>
      <Route path="/dashboard">{() => <LifeworkLayout><ClientDashboard /></LifeworkLayout>}</Route>
      <Route path="/counselor" component={CounselorDashboard} />
      <Route path="/counselor/client/:id" component={ClientProfile} />

      {/* Legacy /ph/* redirects kept for backward compatibility */}
      <Route path="/ph" component={PHHome} />
      <Route path="/ph/coaching" component={PHCoaching} />
      <Route path="/ph/training" component={PHTraining} />
      <Route path="/ph/about" component={PHAbout} />

      {/* Legacy bare Lifework routes — kept so existing bookmarks still work */}
      <Route path="/interview">{() => <LifeworkLayout><Interview /></LifeworkLayout>}</Route>
      <Route path="/background">{() => <LifeworkLayout><Background /></LifeworkLayout>}</Route>
      <Route path="/via">{() => <LifeworkLayout><VIASurvey /></LifeworkLayout>}</Route>
      <Route path="/via/results">{() => <LifeworkLayout><VIAResults /></LifeworkLayout>}</Route>
      <Route path="/ipip-survey">{() => <LifeworkLayout><IpipSurvey /></LifeworkLayout>}</Route>
      <Route path="/ipip-results">{() => <LifeworkLayout><IpipResults /></LifeworkLayout>}</Route>
      <Route path="/ipip/results">{() => <LifeworkLayout><IpipResults /></LifeworkLayout>}</Route>
      <Route path="/my-report">{() => <LifeworkLayout><MyReport /></LifeworkLayout>}</Route>
      <Route path="/career-explorer">{() => <LifeworkLayout><CareerExplorer /></LifeworkLayout>}</Route>

      {/* ── Preview Mode (counsellor-only, no auth required) ── */}
      <Route path="/preview" component={PreviewMode} />
      <Route path="/preview/home" component={PreviewHome} />
      <Route path="/preview/dashboard" component={PreviewClientDashboard} />
      <Route path="/preview/interview" component={PreviewInterview} />
      <Route path="/preview/background" component={PreviewBackground} />
      <Route path="/preview/via" component={PreviewVIASurvey} />
      <Route path="/preview/via/results" component={PreviewVIAResults} />
      <Route path="/preview/results-held/via">{() => <ResultsHeld assessmentName="VIA Character Strengths" />}</Route>
      <Route path="/preview/ipip-survey" component={PreviewIpipSurvey} />
      <Route path="/preview/ipip-results" component={PreviewIpipResults} />
      <Route path="/preview/results-held/ipip">{() => <ResultsHeld assessmentName="Personality Profile" />}</Route>
      <Route path="/preview/my-report" component={PreviewMyReport} />
      <Route path="/preview/career-explorer" component={PreviewCareerExplorer} />
      <Route path="/preview/sage" component={PreviewSage} />

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
          <InstallPrompt />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
