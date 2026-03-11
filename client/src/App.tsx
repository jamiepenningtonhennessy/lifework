import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
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
import CognitiveScreener from "./pages/CognitiveScreener";
import CognitiveResults from "./pages/CognitiveResults";
import MyReport from "./pages/MyReport";
import CareerExplorer from "./pages/CareerExplorer";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/interview" component={Interview} />
      <Route path="/background" component={Background} />
      <Route path="/via" component={VIASurvey} />
      <Route path="/via/results" component={VIAResults} />
      <Route path="/ipip-survey" component={IpipSurvey} />
      <Route path="/ipip-results" component={IpipResults} />
      <Route path="/ipip/results" component={IpipResults} />
      <Route path="/cognitive-screener" component={CognitiveScreener} />
      <Route path="/cognitive-results" component={CognitiveResults} />
      <Route path="/my-report" component={MyReport} />
      <Route path="/career-explorer" component={CareerExplorer} />
      <Route path="/dashboard" component={ClientDashboard} />
      <Route path="/counselor" component={CounselorDashboard} />
      <Route path="/counselor/client/:id" component={ClientProfile} />
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
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
