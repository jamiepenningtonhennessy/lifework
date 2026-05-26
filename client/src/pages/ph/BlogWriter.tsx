import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PHNav } from "@/components/PHNav";
import { PHFooter } from "@/components/PHFooter";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Copy, Check, RefreshCw, ImageIcon, Download, PenLine, Upload } from "lucide-react";

type PostTypeId = string;
type AspectId = string;
type VoiceId = string;
type Mode = "generate" | "own";

export default function BlogWriter() {
  const [mode, setMode] = useState<Mode>("generate");

  // Generate-mode state
  const [selectedPostType, setSelectedPostType] = useState<PostTypeId | null>(null);
  const [selectedAspect, setSelectedAspect] = useState<AspectId | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<VoiceId>("house");

  // Own-post mode state
  const [ownPostText, setOwnPostText] = useState<string>("");
  const [ownPostType, setOwnPostType] = useState<PostTypeId | null>(null);
  const [ownAspect, setOwnAspect] = useState<AspectId | null>(null);

  // Shared output state
  const [generatedPost, setGeneratedPost] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<Array<{ index: number; prompt: string; url: string | null; error: string | null }> | null>(null);
  const [copiedImageIndex, setCopiedImageIndex] = useState<number | null>(null);
  const [selectedRegister, setSelectedRegister] = useState<"A" | "B">("A");

  const { data: taxonomy } = trpc.blogWriter.getTaxonomy.useQuery();

  const generateMutation = trpc.blogWriter.generate.useMutation({
    onSuccess: (data) => {
      setGeneratedPost(data.post);
      setGeneratedImages(null);
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    },
    onError: () => toast.error("Failed to generate post. Please try again."),
  });

  const generateImagesMutation = trpc.blogWriter.generateImages.useMutation({
    onSuccess: (data) => {
      setGeneratedImages(data.images);
      const failed = data.images.filter(i => !i.url).length;
      if (failed > 0) toast.error(`${failed} image(s) failed to generate.`);
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    },
    onError: () => toast.error("Failed to generate images. Please try again."),
  });

  // Derived: the active post text (either generated or own)
  const activePostText = mode === "generate" ? generatedPost : (ownPostText.trim() || null);
  // In own-post mode, fall back to a generic category if the coach hasn't selected one
  const activePostType = mode === "generate" ? selectedPostType : (ownPostType ?? "personal-testimony");
  const activeAspect = mode === "generate" ? selectedAspect : (ownAspect ?? "reflective-process");

  function handleGenerateImages() {
    if (!activePostText || !activePostType || !activeAspect) return;
    setGeneratedImages(null);
    generateImagesMutation.mutate({
      postText: activePostText,
      postType: activePostType as any,
      aspect: activeAspect as any,
      register: selectedRegister,
    });
  }

  function handleCopyImageUrl(url: string, index: number) {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedImageIndex(index);
      toast.success("Image URL copied — paste directly into LinkedIn");
      setTimeout(() => setCopiedImageIndex(null), 2500);
    });
  }

  function handleDownloadImage(url: string, index: number) {
    const a = document.createElement("a");
    document.body.appendChild(a);
    a.href = url;
    a.download = `lifework-post-image-${index}.png`;
    a.target = "_blank";
    a.click();
    setTimeout(() => { document.body.removeChild(a); }, 1000);
  }

  const canGenerate = selectedPostType !== null && selectedAspect !== null && selectedVoice !== null;
  const canGenerateImagesOwn = ownPostText.trim().length > 50;

  function handleGenerate() {
    if (!canGenerate) return;
    setGeneratedPost(null);
    setGeneratedImages(null);
    generateMutation.mutate({
      postType: selectedPostType as any,
      aspect: selectedAspect as any,
      voice: selectedVoice as any,
    });
  }

  function handleCopy() {
    const text = activePostText;
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleModeSwitch(newMode: Mode) {
    setMode(newMode);
    setGeneratedImages(null);
    if (newMode === "generate") {
      // keep generatedPost from previous generate session
    } else {
      // switching to own-post mode — clear generated post display
      setGeneratedPost(null);
    }
  }

  const postTypes = taxonomy?.postTypes ?? [];
  const aspects = taxonomy?.aspects ?? [];
  const voices = taxonomy?.voices ?? [];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--lw-cream)" }}>
      <PHNav />

      {/* Header */}
      <section
        style={{ background: "var(--lw-navy)", paddingTop: "3.5rem", paddingBottom: "3rem" }}
      >
        <div className="container max-w-5xl">
          <div className="flex items-center gap-3 mb-4">
            <div style={{ width: "2rem", height: "1px", background: "var(--lw-gold)" }} />
            <span
              className="font-medium tracking-widest uppercase"
              style={{ fontSize: "0.65rem", color: "var(--lw-gold)", letterSpacing: "0.18em" }}
            >
              Lifework Marketing
            </span>
          </div>
          <h1
            className="font-serif font-bold mb-3"
            style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)", color: "white", lineHeight: 1.2 }}
          >
            Blog Writing Machine
          </h1>
          <p style={{ color: "rgba(255,255,255,0.65)", maxWidth: "38rem", lineHeight: 1.7, fontSize: "0.95rem" }}>
            Write a new LinkedIn post with AI assistance, or bring your own pre-written post and generate a branded image to go with it.
          </p>

          {/* Mode toggle */}
          <div className="flex gap-2 mt-6">
            <button
              onClick={() => handleModeSwitch("generate")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all"
              style={{
                background: mode === "generate" ? "var(--lw-gold)" : "rgba(255,255,255,0.08)",
                color: mode === "generate" ? "white" : "rgba(255,255,255,0.65)",
                border: mode === "generate" ? "2px solid var(--lw-gold)" : "2px solid rgba(255,255,255,0.15)",
              }}
            >
              <PenLine className="w-3.5 h-3.5" />
              Write a new post
            </button>
            <button
              onClick={() => handleModeSwitch("own")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all"
              style={{
                background: mode === "own" ? "var(--lw-gold)" : "rgba(255,255,255,0.08)",
                color: mode === "own" ? "white" : "rgba(255,255,255,0.65)",
                border: mode === "own" ? "2px solid var(--lw-gold)" : "2px solid rgba(255,255,255,0.15)",
              }}
            >
              <Upload className="w-3.5 h-3.5" />
              Use my own post
            </button>
          </div>
        </div>
      </section>

      {/* Main area */}
      <main className="flex-1 container max-w-5xl py-10">

        {/* ── GENERATE MODE ── */}
        {mode === "generate" && (
          <>
            {/* Selection grid */}
            <div className="grid md:grid-cols-2 gap-8 mb-8">

              {/* Column 1: Post type */}
              <div>
                <h2
                  className="font-serif font-semibold mb-1"
                  style={{ color: "var(--lw-navy)", fontSize: "1rem" }}
                >
                  Type of post
                </h2>
                <p className="text-xs mb-4" style={{ color: "rgba(0,0,0,0.45)" }}>
                  Select one
                </p>
                <div className="space-y-2">
                  {postTypes.map((pt) => (
                    <button
                      key={pt.id}
                      onClick={() => setSelectedPostType(pt.id)}
                      className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all"
                      style={{
                        background: selectedPostType === pt.id ? "var(--lw-navy)" : "white",
                        color: selectedPostType === pt.id ? "white" : "var(--lw-navy)",
                        border: selectedPostType === pt.id
                          ? "2px solid var(--lw-navy)"
                          : "2px solid rgba(0,0,0,0.08)",
                        boxShadow: selectedPostType === pt.id ? "0 2px 8px rgba(0,0,0,0.12)" : "none",
                      }}
                    >
                      {pt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Column 2: Lifework aspect */}
              <div>
                <h2
                  className="font-serif font-semibold mb-1"
                  style={{ color: "var(--lw-navy)", fontSize: "1rem" }}
                >
                  Aspect of Lifework
                </h2>
                <p className="text-xs mb-4" style={{ color: "rgba(0,0,0,0.45)" }}>
                  Select one
                </p>
                <div className="space-y-2">
                  {aspects.map((asp) => (
                    <button
                      key={asp.id}
                      onClick={() => setSelectedAspect(asp.id)}
                      className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all"
                      style={{
                        background: selectedAspect === asp.id ? "var(--lw-navy)" : "white",
                        color: selectedAspect === asp.id ? "white" : "var(--lw-navy)",
                        border: selectedAspect === asp.id
                          ? "2px solid var(--lw-navy)"
                          : "2px solid rgba(0,0,0,0.08)",
                        boxShadow: selectedAspect === asp.id ? "0 2px 8px rgba(0,0,0,0.12)" : "none",
                      }}
                    >
                      {asp.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Voice selector */}
            <div className="mb-8">
              <h2
                className="font-serif font-semibold mb-1"
                style={{ color: "var(--lw-navy)", fontSize: "1rem" }}
              >
                Writing voice
              </h2>
              <p className="text-xs mb-4" style={{ color: "rgba(0,0,0,0.45)" }}>
                Select one
              </p>
              <div className="flex flex-wrap gap-2">
                {voices.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVoice(v.id)}
                    className="px-5 py-2.5 rounded-full text-sm font-medium transition-all"
                    style={{
                      background: selectedVoice === v.id ? "var(--lw-gold)" : "white",
                      color: selectedVoice === v.id ? "white" : "var(--lw-navy)",
                      border: selectedVoice === v.id
                        ? "2px solid var(--lw-gold)"
                        : "2px solid rgba(0,0,0,0.08)",
                      boxShadow: selectedVoice === v.id ? "0 2px 8px rgba(201,151,58,0.3)" : "none",
                    }}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate button */}
            <div className="flex items-center gap-4 mb-10">
              <Button
                onClick={handleGenerate}
                disabled={!canGenerate || generateMutation.isPending}
                className="gap-2 px-8 py-3 text-sm font-medium tracking-wide"
                style={{
                  background: canGenerate ? "var(--lw-gold)" : "rgba(0,0,0,0.12)",
                  color: canGenerate ? "white" : "rgba(0,0,0,0.35)",
                  border: "none",
                  opacity: generateMutation.isPending ? 0.7 : 1,
                }}
              >
                {generateMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Writing post…</>
                ) : generatedPost ? (
                  <><RefreshCw className="w-4 h-4" /> Regenerate</>
                ) : (
                  "Write post"
                )}
              </Button>
              {!canGenerate && (
                <p className="text-xs" style={{ color: "rgba(0,0,0,0.4)" }}>
                  Select a post type and a Lifework aspect to continue
                </p>
              )}
            </div>
          </>
        )}

        {/* ── OWN POST MODE ── */}
        {mode === "own" && (
          <div className="mb-10">
            <div
              className="rounded-2xl overflow-hidden mb-8"
              style={{
                border: "1px solid rgba(201,151,58,0.25)",
                boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
              }}
            >
              <div
                className="px-6 py-4"
                style={{ background: "var(--lw-navy)", borderBottom: "2px solid var(--lw-gold)" }}
              >
                <span className="font-serif font-semibold text-sm" style={{ color: "white" }}>
                  Paste your post
                </span>
              </div>
              <div className="p-6" style={{ background: "white" }}>
                <textarea
                  value={ownPostText}
                  onChange={(e) => { setOwnPostText(e.target.value); setGeneratedImages(null); }}
                  placeholder="Paste your pre-written LinkedIn post here…"
                  rows={10}
                  className="w-full resize-none rounded-lg px-4 py-3 text-sm leading-relaxed outline-none transition-all"
                  style={{
                    fontFamily: "Georgia, serif",
                    color: "var(--lw-navy)",
                    background: "rgba(0,0,0,0.02)",
                    border: "1.5px solid rgba(0,0,0,0.1)",
                    lineHeight: 1.8,
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "var(--lw-gold)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.1)"; }}
                />
                {ownPostText.trim().length > 0 && (
                  <p className="text-xs mt-2" style={{ color: "rgba(0,0,0,0.35)" }}>
                    {ownPostText.trim().split(/\s+/).filter(Boolean).length} words
                  </p>
                )}
              </div>
            </div>

            {/* Post type + aspect selectors for own-post mode — optional, used only for footer label */}
            <details className="mb-6">
              <summary
                className="text-xs font-medium cursor-pointer select-none"
                style={{ color: "rgba(0,0,0,0.4)", letterSpacing: "0.04em" }}
              >
                Optional: set footer label (post type &amp; Lifework aspect)
              </summary>
              <p className="text-xs mt-1 mb-4" style={{ color: "rgba(0,0,0,0.35)" }}>
                If not set, the image footer will show the default Lifework branding.
              </p>
            <div className="grid md:grid-cols-2 gap-8 mt-4">
              <div>
                <h2
                  className="font-serif font-semibold mb-1"
                  style={{ color: "var(--lw-navy)", fontSize: "1rem" }}
                >
                  Type of post
                </h2>
                <p className="text-xs mb-4" style={{ color: "rgba(0,0,0,0.45)" }}>
                  Select the closest match
                </p>
                <div className="space-y-2">
                  {postTypes.map((pt) => (
                    <button
                      key={pt.id}
                      onClick={() => setOwnPostType(pt.id)}
                      className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all"
                      style={{
                        background: ownPostType === pt.id ? "var(--lw-navy)" : "white",
                        color: ownPostType === pt.id ? "white" : "var(--lw-navy)",
                        border: ownPostType === pt.id
                          ? "2px solid var(--lw-navy)"
                          : "2px solid rgba(0,0,0,0.08)",
                        boxShadow: ownPostType === pt.id ? "0 2px 8px rgba(0,0,0,0.12)" : "none",
                      }}
                    >
                      {pt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h2
                  className="font-serif font-semibold mb-1"
                  style={{ color: "var(--lw-navy)", fontSize: "1rem" }}
                >
                  Aspect of Lifework
                </h2>
                <p className="text-xs mb-4" style={{ color: "rgba(0,0,0,0.45)" }}>
                  Select the closest match
                </p>
                <div className="space-y-2">
                  {aspects.map((asp) => (
                    <button
                      key={asp.id}
                      onClick={() => setOwnAspect(asp.id)}
                      className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all"
                      style={{
                        background: ownAspect === asp.id ? "var(--lw-navy)" : "white",
                        color: ownAspect === asp.id ? "white" : "var(--lw-navy)",
                        border: ownAspect === asp.id
                          ? "2px solid var(--lw-navy)"
                          : "2px solid rgba(0,0,0,0.08)",
                        boxShadow: ownAspect === asp.id ? "0 2px 8px rgba(0,0,0,0.12)" : "none",
                      }}
                    >
                      {asp.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            </details>
          </div>
        )}

        {/* ── IMAGE GENERATION (shared between both modes) ── */}
        {((mode === "generate" && generatedPost) || (mode === "own" && canGenerateImagesOwn)) && (
          <div className="flex flex-col gap-4 mb-10">
            {/* Register selector */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium tracking-wide uppercase" style={{ color: "rgba(0,0,0,0.45)", letterSpacing: "0.1em" }}>Photo style</span>
              <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid rgba(201,151,58,0.35)" }}>
                {(["A", "B"] as const).map((reg) => (
                  <button
                    key={reg}
                    onClick={() => setSelectedRegister(reg)}
                    className="px-4 py-1.5 text-xs font-medium transition-colors"
                    style={{
                      background: selectedRegister === reg ? "var(--lw-navy)" : "transparent",
                      color: selectedRegister === reg ? "white" : "var(--lw-navy)",
                      borderRight: reg === "A" ? "1px solid rgba(201,151,58,0.35)" : "none",
                    }}
                  >
                    {reg === "A" ? "Warm Cinematic" : "Painterly Quiet"}
                  </button>
                ))}
              </div>
              <span className="text-xs" style={{ color: "rgba(0,0,0,0.35)" }}>
                {selectedRegister === "A" ? "Warm, directional light — Heisler / Leibovitz register" : "Soft, fragmentary — Saul Leiter / Kawauchi register"}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Button
                onClick={handleGenerateImages}
                disabled={generateImagesMutation.isPending}
                className="gap-2 px-8 py-3 text-sm font-medium tracking-wide"
                style={{
                  background: "var(--lw-navy)",
                  color: "white",
                  border: "none",
                  opacity: generateImagesMutation.isPending ? 0.7 : 1,
                }}
              >
                {generateImagesMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Generating images…</>
                ) : generatedImages ? (
                  <><RefreshCw className="w-4 h-4" /> Regenerate images</>
                ) : (
                  <><ImageIcon className="w-4 h-4" /> Generate 3 image options</>
                )}
              </Button>
              {!generatedImages && !generateImagesMutation.isPending && (
                <p className="text-xs" style={{ color: "rgba(0,0,0,0.4)" }}>
                  Creates 3 distinct LinkedIn-sized image options to accompany your post
                </p>
              )}
            </div>
          </div>
        )}

        {/* Hint for own-post mode when post is too short */}
        {mode === "own" && ownPostText.trim().length > 0 && ownPostText.trim().length <= 50 && (
          <p className="text-xs mb-6" style={{ color: "rgba(0,0,0,0.4)" }}>
            Post is too short — paste the full text to continue.
          </p>
        )}

        {/* Generated images output */}
        {(generatedImages || generateImagesMutation.isPending) && (
          <div
            className="rounded-2xl overflow-hidden mb-10"
            style={{
              border: "1px solid rgba(201,151,58,0.25)",
              boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
            }}
          >
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ background: "var(--lw-navy)", borderBottom: "2px solid var(--lw-gold)" }}
            >
              <span className="font-serif font-semibold text-sm" style={{ color: "white" }}>
                Companion Images
              </span>
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
                Click any image to download
              </span>
            </div>

            <div className="p-6" style={{ background: "white" }}>
              {generateImagesMutation.isPending ? (
                <div className="flex flex-col items-center gap-4 py-12" style={{ color: "rgba(0,0,0,0.4)" }}>
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--lw-gold)" }} />
                  <p className="text-sm">Generating 3 images — this takes 20–40 seconds…</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {generatedImages?.map((img) => (
                    <div key={img.index} className="relative group">
                      {img.url ? (
                        <>
                          <img
                            src={img.url}
                            alt={`Image option ${img.index}`}
                            className="w-full rounded-xl"
                            style={{ display: "block" }}
                          />
                          <div className="absolute top-3 right-3 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleCopyImageUrl(img.url!, img.index)}
                              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full"
                              style={{
                                background: copiedImageIndex === img.index ? "rgba(201,151,58,0.85)" : "rgba(10,22,40,0.75)",
                                color: "white",
                                backdropFilter: "blur(4px)",
                              }}
                              title="Copy image URL for LinkedIn"
                            >
                              {copiedImageIndex === img.index ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                              {copiedImageIndex === img.index ? "Copied!" : "Copy URL"}
                            </button>
                            <button
                              onClick={() => handleDownloadImage(img.url!, img.index)}
                              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full"
                              style={{
                                background: "rgba(10,22,40,0.75)",
                                color: "white",
                                backdropFilter: "blur(4px)",
                              }}
                              title="Download image"
                            >
                              <Download className="w-3 h-3" /> Download
                            </button>
                          </div>
                        </>
                      ) : (
                        <div
                          className="w-full rounded-xl flex items-center justify-center"
                          style={{ aspectRatio: "1/1", background: "rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.08)" }}
                        >
                          <span className="text-xs" style={{ color: "rgba(0,0,0,0.35)" }}>Generation failed</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Generated post output — only shown in generate mode */}
        {mode === "generate" && (generatedPost || generateMutation.isPending) && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              border: "1px solid rgba(201,151,58,0.25)",
              boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
            }}
          >
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ background: "var(--lw-navy)", borderBottom: "2px solid var(--lw-gold)" }}
            >
              <div className="flex items-center gap-3">
                <span className="font-serif font-semibold text-sm" style={{ color: "white" }}>
                  LinkedIn Post
                </span>
                {generatedPost && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(201,151,58,0.2)", color: "var(--lw-gold)" }}
                  >
                    {generatedPost.split(/\s+/).filter(Boolean).length} words
                  </span>
                )}
              </div>
              {generatedPost && (
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-all"
                  style={{
                    background: copied ? "rgba(201,151,58,0.2)" : "rgba(255,255,255,0.08)",
                    color: copied ? "var(--lw-gold)" : "rgba(255,255,255,0.7)",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              )}
            </div>

            <div className="px-8 py-8" style={{ background: "white" }}>
              {generateMutation.isPending ? (
                <div className="flex items-center gap-3" style={{ color: "rgba(0,0,0,0.4)" }}>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Writing your post…</span>
                </div>
              ) : (
                <p
                  className="leading-relaxed whitespace-pre-wrap"
                  style={{
                    color: "var(--lw-navy)",
                    fontSize: "0.95rem",
                    lineHeight: 1.8,
                    fontFamily: "Georgia, serif",
                  }}
                >
                  {generatedPost}
                </p>
              )}
            </div>

            {generatedPost && (
              <div
                className="px-8 py-4 text-xs"
                style={{
                  background: "rgba(201,151,58,0.05)",
                  borderTop: "1px solid rgba(201,151,58,0.15)",
                  color: "rgba(0,0,0,0.45)",
                }}
              >
                This post is generated for your own account. Edit freely before publishing — it is a starting point, not a finished article.
              </div>
            )}
          </div>
        )}
      </main>

      <PHFooter />
    </div>
  );
}
