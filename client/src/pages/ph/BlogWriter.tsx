import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PHNav } from "@/components/PHNav";
import { PHFooter } from "@/components/PHFooter";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Copy, Check, RefreshCw, ImageIcon, Download } from "lucide-react";

type PostTypeId = string;
type AspectId = string;
type VoiceId = string;

export default function BlogWriter() {
  const [selectedPostType, setSelectedPostType] = useState<PostTypeId | null>(null);
  const [selectedAspect, setSelectedAspect] = useState<AspectId | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<VoiceId>("house");
  const [generatedPost, setGeneratedPost] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<Array<{ index: number; prompt: string; url: string | null; error: string | null }> | null>(null);

  const { data: taxonomy } = trpc.blogWriter.getTaxonomy.useQuery();

  const generateMutation = trpc.blogWriter.generate.useMutation({
    onSuccess: (data) => {
      setGeneratedPost(data.post);
      setGeneratedImages(null); // reset images when post is regenerated
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

  function handleGenerateImages() {
    if (!generatedPost || !selectedPostType || !selectedAspect) return;
    setGeneratedImages(null);
    generateImagesMutation.mutate({
      postText: generatedPost,
      postType: selectedPostType as any,
      aspect: selectedAspect as any,
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

  function handleGenerate() {
    if (!canGenerate) return;
    setGeneratedPost(null);
    generateMutation.mutate({
      postType: selectedPostType as any,
      aspect: selectedAspect as any,
      voice: selectedVoice as any,
    });
  }

  function handleCopy() {
    if (!generatedPost) return;
    navigator.clipboard.writeText(generatedPost).then(() => {
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    });
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
            Choose a post type, a Lifework topic, and a writing voice. The machine will write a
            LinkedIn-ready post of around 300 words for you to publish on your own account.
          </p>
        </div>
      </section>

      {/* Main selection area */}
      <main className="flex-1 container max-w-5xl py-10">

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

        {/* Image generation button — shown once a post exists */}
        {generatedPost && (
          <div className="flex items-center gap-4 mb-10">
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
            {/* Images header */}
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
                <div className="flex flex-col gap-6">
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
                          <button
                            onClick={() => handleDownloadImage(img.url!, img.index)}
                            className="absolute top-3 right-3 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{
                              background: "rgba(10,22,40,0.75)",
                              color: "white",
                              backdropFilter: "blur(4px)",
                            }}
                            title="Download image"
                          >
                            <Download className="w-3 h-3" /> Download
                          </button>
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

        {/* Generated post output */}
        {(generatedPost || generateMutation.isPending) && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              border: "1px solid rgba(201,151,58,0.25)",
              boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
            }}
          >
            {/* Output header */}
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

            {/* Post content */}
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

            {/* Footer hint */}
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
