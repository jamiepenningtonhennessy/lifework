// @vitest-environment jsdom
import React from "react";
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Background from "@/pages/Background";
import { DashboardBody } from "@/pages/ClientDashboard";
import VIASurvey from "@/pages/VIASurvey";
import IpipSurvey from "@/pages/IpipSurvey";
import { FAMILY_REQUIRED_FIELDS } from "../shared/familyBackground";

const state = vi.hoisted(() => ({
  queries: {} as Record<string, any>,
  mutations: {} as Record<string, any>,
  navigate: vi.fn(),
  invalidate: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ isAuthenticated: true, loading: false, user: { name: "Synthetic Client" } }) }));
vi.mock("wouter", () => ({ useLocation: () => ["/background", state.navigate] }));
vi.mock("@/components/ChatToPeter", () => ({ ChatToPeter: () => null }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));
vi.mock("@/lib/trpc", () => {
  const node = (path: string[] = []): any => new Proxy(() => {}, {
    get: (_target, key) => {
      if (key === "useUtils") return () => node(["utils"]);
      if (key === "invalidate") return (...args: any[]) => state.invalidate(path.join("."), ...args);
      if (key === "useQuery") return () => ({
        isLoading: false,
        isFetching: false,
        isError: false,
        ...state.queries[path.join(".")],
        refetch: (...args: any[]) => state.refetch(path.join("."), ...args),
      });
      if (key === "useMutation") return () => ({ isPending: false, mutate: vi.fn(), ...state.mutations[path.join(".")] });
      return node([...path, String(key)]);
    },
  });
  return { trpc: node() };
});

function completeFamily() {
  return {
    fatherOccupation: "Synthetic engineer",
    motherOccupation: "Not known",
    siblingPosition: "Not applicable",
    upbringingLocation: "Synthetic town",
    familyNarrative: "Prefer not to say",
    significantInfluences: "Synthetic mentor",
  };
}

function gate(overrides: Record<string, unknown> = {}) {
  return { total: 20, enriched: 0, requiredEvents: 20, hasMinimumEvents: true, remainingEvents: 0, sageConversationCompleted: true, familyBackgroundCompleted: true, unlocked: true, blocker: null, ...overrides };
}
function input(field: string) { return document.getElementById(`family-${field}`) as HTMLInputElement; }
function next() { return screen.getByRole("button", { name: "Next: VIA Survey" }); }
function fillFamily() {
  for (const field of FAMILY_REQUIRED_FIELDS) fireEvent.change(input(field), { target: { value: completeFamily()[field] } });
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

beforeEach(() => {
  vi.stubGlobal("React", React);
  window.history.replaceState(null, "", "/background");
  state.navigate.mockReset();
  state.invalidate.mockReset().mockResolvedValue(undefined);
  state.refetch.mockReset().mockImplementation(async (route: string) => ({ data: state.queries[route]?.data }));
  state.queries = {
    "background.getFamily": { data: null },
    "background.getCareerReflection": { data: null },
    "profile.getMyProfile": { data: null },
    "profile.getEnrichmentStatus": { data: gate() },
    "via.getQuestions": { data: { questions: [{ id: 1, text: "Synthetic VIA statement" }] } },
    "via.getMyResults": { data: null },
    "ipip.getMyResults": { data: null },
  };
  state.mutations = {
    "background.saveFamily": { mutateAsync: vi.fn().mockImplementation(async ({ complete: _complete, ...data }) => {
      state.queries["background.getFamily"] = { data };
      return { success: true };
    }) },
    "background.saveCareerReflection": { mutateAsync: vi.fn().mockImplementation(async (data) => {
      state.queries["background.getCareerReflection"] = { data };
      return { success: true };
    }) },
  };
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("mounted family background", () => {
  it("hydrates all six fields after a cold-cache asynchronous response", () => {
    state.queries["background.getFamily"] = { data: undefined, isLoading: true, isFetching: true };
    const view = render(<Background />);
    expect(next()).toBeDisabled();
    expect(screen.getByText("Loading Family Background…")).toBeInTheDocument();
    state.queries["background.getFamily"] = { data: completeFamily() };
    view.rerender(<Background />);
    for (const field of FAMILY_REQUIRED_FIELDS) expect(input(field)).toHaveValue(completeFamily()[field]);
    expect(next()).toBeEnabled();
  });

  it("does not overwrite edited family fields on a background refetch", () => {
    state.queries["background.getFamily"] = { data: completeFamily() };
    const view = render(<Background />);
    fireEvent.change(input("fatherOccupation"), { target: { value: "My unsaved edit" } });
    state.queries["background.getFamily"] = { data: { ...completeFamily(), fatherOccupation: "Changed remotely", motherOccupation: "Remote edit" } };
    view.rerender(<Background />);
    expect(input("fatherOccupation")).toHaveValue("My unsaved edit");
    expect(input("motherOccupation")).toHaveValue("Not known");
    expect(next()).toBeDisabled();
  });

  it("keeps both form nodes and unsaved edits mounted across tab switches", () => {
    render(<Background />);
    const familyNode = input("fatherOccupation");
    fireEvent.change(familyNode, { target: { value: "Local family answer" } });
    fireEvent.click(screen.getByRole("button", { name: "Career History" }));
    const careerNode = screen.getByLabelText("What you have really enjoyed in your career");
    fireEvent.change(careerNode, { target: { value: "Local career answer" } });
    fireEvent.click(screen.getByRole("button", { name: "Family Background" }));
    expect(input("fatherOccupation")).toBe(familyNode);
    expect(familyNode).toHaveValue("Local family answer");
    fireEvent.click(screen.getByRole("button", { name: "Career History" }));
    expect(screen.getByLabelText("What you have really enjoyed in your career")).toBe(careerNode);
    expect(careerNode).toHaveValue("Local career answer");
  });

  it("allows a partial draft save but never allows incomplete progression", async () => {
    render(<Background />);
    fireEvent.change(input("fatherOccupation"), { target: { value: " Draft answer " } });
    expect(screen.getByRole("button", { name: "Save Family Background" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Save progress" }));
    await screen.findByText("Progress saved. Complete the remaining family answers before the questionnaires.");
    expect(state.mutations["background.saveFamily"].mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ fatherOccupation: "Draft answer", complete: false }));
    expect(next()).toBeDisabled();
  });

  it("requires trimmed nonblank answers and explains accepted privacy responses and the original household prompt", () => {
    render(<Background />);
    fillFamily();
    fireEvent.change(input("significantInfluences"), { target: { value: " \n " } });
    expect(screen.getByRole("button", { name: "Save Family Background" })).toBeDisabled();
    expect(screen.getByText(/“Not known”, “Not applicable”, and “Prefer not to say” are valid answers/)).toBeInTheDocument();
    expect(screen.getByText(/What were three rules that I would need to know/)).toHaveTextContent("And what might your family motto have been, if you had been asked for one?");
    expect(next()).toBeDisabled();
  });

  it("retains all edits and prevents navigation on mutation failure", async () => {
    state.mutations["background.saveFamily"].mutateAsync.mockRejectedValue(new Error("Synthetic save failure"));
    render(<Background />);
    fillFamily();
    fireEvent.click(screen.getByRole("button", { name: "Save Family Background" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Synthetic save failure");
    for (const field of FAMILY_REQUIRED_FIELDS) expect(input(field)).toHaveValue(completeFamily()[field]);
    expect(next()).toBeDisabled();
    fireEvent.click(next());
    expect(state.navigate).not.toHaveBeenCalled();
  });

  it("recovers from a failed family save without requiring the retained answers to be re-entered", async () => {
    state.mutations["background.saveFamily"].mutateAsync.mockRejectedValueOnce(new Error("Synthetic temporary failure"));
    render(<Background />);
    fillFamily();
    fireEvent.click(screen.getByRole("button", { name: "Save Family Background" }));
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Save Family Background" }));
    await waitFor(() => expect(next()).toBeEnabled());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(input("familyNarrative")).toHaveValue("Prefer not to say");
  });

  it("keeps edits and Next blocked when the authoritative post-save read fails", async () => {
    state.refetch.mockRejectedValueOnce(new Error("Synthetic confirmation failure"));
    render(<Background />);
    fillFamily();
    fireEvent.click(screen.getByRole("button", { name: "Save Family Background" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Synthetic confirmation failure");
    expect(input("fatherOccupation")).toHaveValue("Synthetic engineer");
    expect(next()).toBeDisabled();
  });

  it("stays blocked during save and authoritative confirmation, then progresses after all six are saved", async () => {
    const saving = deferred<any>();
    const confirming = deferred<any>();
    state.mutations["background.saveFamily"].mutateAsync.mockReturnValue(saving.promise);
    state.refetch.mockReturnValue(confirming.promise);
    render(<Background />);
    fillFamily();
    fireEvent.change(input("fatherOccupation"), { target: { value: " Synthetic engineer " } });
    fireEvent.click(screen.getByRole("button", { name: "Save Family Background" }));
    expect(next()).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save progress" })).toBeDisabled();
    await act(async () => { saving.resolve({ success: true }); });
    expect(next()).toBeDisabled();
    await act(async () => {
      state.queries["background.getFamily"] = { data: completeFamily() };
      confirming.resolve({ data: completeFamily() });
    });
    await waitFor(() => expect(next()).toBeEnabled());
    expect(state.mutations["background.saveFamily"].mutateAsync).toHaveBeenCalledWith({ ...completeFamily(), complete: true });
    expect(state.invalidate).toHaveBeenCalledWith("utils.profile.getEnrichmentStatus");
    expect(state.invalidate).toHaveBeenCalledWith("utils.profile.getMyProfile");
    fireEvent.click(next());
    expect(state.navigate).toHaveBeenCalledWith("/via");
  });

  it("does not advertise successful completion if the authoritative read is stale or incomplete", async () => {
    state.mutations["background.saveFamily"].mutateAsync.mockResolvedValue({ success: true });
    render(<Background />);
    fillFamily();
    fireEvent.click(screen.getByRole("button", { name: "Save Family Background" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("could not be confirmed");
    expect(input("familyNarrative")).toHaveValue("Prefer not to say");
    expect(next()).toBeDisabled();
  });

  it("preserves edits made during an in-flight save rather than clearing their dirty state", async () => {
    const saving = deferred<any>();
    state.mutations["background.saveFamily"].mutateAsync.mockReturnValue(saving.promise);
    render(<Background />);
    fillFamily();
    fireEvent.click(screen.getByRole("button", { name: "Save Family Background" }));
    fireEvent.change(input("fatherOccupation"), { target: { value: "Newer local answer" } });
    await act(async () => {
      state.queries["background.getFamily"] = { data: completeFamily() };
      saving.resolve({ success: true });
    });
    await waitFor(() => expect(screen.getByRole("button", { name: "Save Family Background" })).toBeEnabled());
    expect(input("fatherOccupation")).toHaveValue("Newer local answer");
    expect(next()).toBeDisabled();
  });

  it.each([
    { data: undefined, isError: true },
    { data: undefined },
    { data: completeFamily(), isError: true },
  ])("blocks unknown/error family data and provides retry without a blank save: %j", (query) => {
    state.queries["background.getFamily"] = query;
    render(<Background />);
    expect(screen.getByRole("alert")).toHaveTextContent("Saving is disabled");
    expect(next()).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save progress" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save Family Background" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Retry loading Family Background" }));
    expect(state.refetch).toHaveBeenCalledWith("background.getFamily");
    expect(state.mutations["background.saveFamily"].mutateAsync).not.toHaveBeenCalled();
  });

  it("blocks Next during a refetch even when cached family answers are complete", () => {
    state.queries["background.getFamily"] = { data: completeFamily(), isFetching: true };
    render(<Background />);
    expect(next()).toBeDisabled();
  });

  it("lets a complete saved family progress without any career completion", () => {
    state.queries["background.getFamily"] = { data: completeFamily() };
    state.queries["background.getCareerReflection"] = { data: null };
    render(<Background />);
    expect(next()).toBeEnabled();
    expect(state.mutations["background.saveFamily"].mutateAsync).not.toHaveBeenCalled();
    expect(state.mutations["background.saveCareerReflection"].mutateAsync).not.toHaveBeenCalled();
  });
});

describe("mounted optional career safeguards", () => {
  it("hydrates a cold career query but does not overwrite dirty text on refetch", () => {
    state.queries["background.getFamily"] = { data: completeFamily() };
    state.queries["background.getCareerReflection"] = { data: undefined, isLoading: true };
    const view = render(<Background />);
    fireEvent.click(screen.getByRole("button", { name: "Career History" }));
    state.queries["background.getCareerReflection"] = { data: { careerReflection: "Synthetic saved reflection" } };
    view.rerender(<Background />);
    const reflection = screen.getByLabelText("What you have really enjoyed in your career");
    expect(reflection).toHaveValue("Synthetic saved reflection");
    fireEvent.change(reflection, { target: { value: "Unsaved reflection" } });
    state.queries["background.getCareerReflection"] = { data: { careerReflection: "Remote reflection" } };
    view.rerender(<Background />);
    expect(reflection).toHaveValue("Unsaved reflection");
    expect(next()).toBeDisabled();
  });

  it("shows career save failure, retains text across tabs and blocks Next until retry succeeds", async () => {
    state.queries["background.getFamily"] = { data: completeFamily() };
    state.mutations["background.saveCareerReflection"].mutateAsync.mockRejectedValueOnce(new Error("Synthetic career failure"));
    render(<Background />);
    expect(next()).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Career History" }));
    const reflection = screen.getByLabelText("What you have really enjoyed in your career");
    fireEvent.change(reflection, { target: { value: "Unsaved career edit" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Career Reflections" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Synthetic career failure");
    expect(reflection).toHaveValue("Unsaved career edit");
    fireEvent.click(screen.getByRole("button", { name: "Family Background" }));
    expect(next()).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Career History" }));
    fireEvent.click(screen.getByRole("button", { name: "Save Career Reflections" }));
    await waitFor(() => expect(next()).toBeEnabled());
    expect(reflection).toHaveValue("Unsaved career edit");
  });

  it("prevents a blank career save on a load error without making career a prerequisite", () => {
    state.queries["background.getFamily"] = { data: completeFamily() };
    state.queries["background.getCareerReflection"] = { data: undefined, isError: true };
    render(<Background />);
    fireEvent.click(screen.getByRole("button", { name: "Career History" }));
    expect(screen.getByRole("button", { name: "Save Career Reflections" })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load your saved career reflections");
    expect(next()).toBeEnabled();
  });
});

describe("mounted questionnaire family requirements", () => {
  it.each([VIASurvey, IpipSurvey])("links an explicit family blocker to /background", (Survey) => {
    state.queries["profile.getEnrichmentStatus"] = { data: gate({ unlocked: false, familyBackgroundCompleted: false, blocker: "family_background" }) };
    render(<Survey />);
    expect(screen.getByText(/Complete and save all six Family Background answers before starting/)).toBeInTheDocument();
    expect(screen.getByText(/“Prefer not to say” are valid answers/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Complete Family Background" }));
    expect(state.navigate).toHaveBeenCalledWith("/background");
  });

  it.each([VIASurvey, IpipSurvey])("does not render questions while requirements are pending", (Survey) => {
    state.queries["profile.getEnrichmentStatus"] = { data: undefined, isLoading: true };
    render(<Survey />);
    expect(screen.getByLabelText("Checking questionnaire requirements")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Submit/ })).not.toBeInTheDocument();
    expect(screen.queryByText("Synthetic VIA statement")).not.toBeInTheDocument();
  });

  it.each([VIASurvey, IpipSurvey])("does not expose questions before existing-result loading finishes", (Survey) => {
    state.queries[Survey === VIASurvey ? "via.getMyResults" : "ipip.getMyResults"] = { data: undefined, isLoading: true };
    render(<Survey />);
    expect(screen.getByLabelText("Checking questionnaire requirements")).toBeInTheDocument();
  });

  it.each([VIASurvey, IpipSurvey])("fails closed when a settled requirement query supplies no data", (Survey) => {
    state.queries["profile.getEnrichmentStatus"] = { data: undefined };
    render(<Survey />);
    expect(screen.getByRole("alert")).toHaveTextContent("Could not verify your saved Family Background");
    expect(screen.getByRole("button", { name: "Retry requirements" })).toBeEnabled();
  });

  it.each([VIASurvey, IpipSurvey])("fails closed and permits retry for missing requirement data", (Survey) => {
    state.queries["profile.getEnrichmentStatus"] = { data: undefined, isError: true };
    render(<Survey />);
    expect(screen.getByRole("alert")).toHaveTextContent("Could not verify your saved Family Background");
    fireEvent.click(screen.getByRole("button", { name: "Retry requirements" }));
    expect(state.refetch).toHaveBeenCalledWith("profile.getEnrichmentStatus");
  });

  it("preserves the original completed VIA confirmation even when new family requirements fail", () => {
    state.queries["via.getMyResults"] = { data: { strengths: [{ name: "Synthetic strength" }] } };
    state.queries["profile.getEnrichmentStatus"] = { data: undefined, isLoading: true, isError: true };
    state.queries["via.getQuestions"] = { data: undefined, isLoading: true };
    render(<VIASurvey />);
    expect(screen.getByText("VIA Character Strengths Complete")).toBeInTheDocument();
    expect(screen.getByText("Your results will be shared in your Wow Report session")).toBeInTheDocument();
    expect(screen.queryByText("Psychometrics not yet unlocked")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue to Personality Profile" }));
    expect(state.navigate).toHaveBeenCalledWith("/ipip-survey");
  });
});

describe("mounted dashboard family status", () => {
  const profile = { backgroundStatus: "completed", interviewStatus: "completed", viaStatus: "not_started", ipipStatus: "not_started" };
  function dashboard(status: any, savedProfile = profile) {
    return <DashboardBody profile={savedProfile} enrichmentStatus={status} loadingProfile={false} isPreview onNavigate={state.navigate} />;
  }

  it("does not count CV-only combined completion as family completion and links its questionnaire blocker", () => {
    render(dashboard(gate({ unlocked: false, familyBackgroundCompleted: false, blocker: "family_background" })));
    expect(screen.getByText(/Family Background is not yet confirmed complete/)).toBeInTheDocument();
    expect(screen.getByText("Complete your Family Background first")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Complete Family Background" })).toHaveAttribute("href", "/background");
    expect(screen.queryByRole("button", { name: "Begin Psychometrics" })).not.toBeInTheDocument();
    const familyCard = screen.getByText("2. Background & History").closest('[data-slot="card"]')!;
    expect(within(familyCard as HTMLElement).getByText("In Progress")).toBeInTheDocument();
    expect(screen.queryByText("Sage stage complete — ready for Psychometrics")).not.toBeInTheDocument();
    expect(screen.getByText("Sage stage complete — Family Background still required")).toBeInTheDocument();
  });

  it("recognises six saved family answers independently of the historical combined flag", () => {
    render(dashboard(gate(), { ...profile, backgroundStatus: "not_started" }));
    expect(screen.getByText("Family Background complete — all six answers are saved.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Begin Psychometrics" })).toBeInTheDocument();
  });

  it("preserves completed surveys and coaching access for legacy completed clients", () => {
    render(dashboard(gate({ unlocked: false, familyBackgroundCompleted: false }), { ...profile, viaStatus: "completed", ipipStatus: "completed" }));
    expect(screen.queryByText("Complete your Family Background first")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Arrange Coaching" })).toBeInTheDocument();
  });
});
