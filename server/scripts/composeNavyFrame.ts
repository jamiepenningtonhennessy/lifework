/**
 * Navy Frame compositor — pure Node.js/sharp implementation.
 *
 * Replaces the Python/PIL compositor so the image pipeline works in the
 * deployed production container (which does not have Python or Pillow).
 *
 * Canvas: 1080×1080px
 * - Outer frame: navy #1a2744, full bleed
 * - Inner photo: 960×820px, centred horizontally (60px each side), 30px from top
 * - Bottom rail: 200px, navy, full width
 * - Tangram mark: 90×90px, left edge of rail (x=60), vertically centred
 * - Lifework wordmark: NotoSerif, ~72px tall, cream #f5f0e8, after tangram
 * - Category label: NotoSans, ~32px tall, cream, letter-spaced, right-aligned
 *
 * Text is rendered via sharp's native Pango text input (not SVG/librsvg),
 * which requires a fontfile path on disk. Fonts are fetched from CDN on
 * first use, written to a process-lifetime temp file, and reused thereafter.
 * A local filesystem fallback is used when CDN is unavailable.
 */

import sharp from "sharp";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as https from "https";
import * as http from "http";

// CDN URLs for fonts (uploaded as static webdev assets — never expire)
const SERIF_FONT_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/107696804/kFbbE6kqNApXGDFpQJUGV7/NotoSerif-Regular_060c2d57.ttf";
const SANS_FONT_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/107696804/kFbbE6kqNApXGDFpQJUGV7/NotoSans-Regular_b64a5eb9.ttf";
const TANGRAM_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/107696804/kFbbE6kqNApXGDFpQJUGV7/tangram_ec333843.png";

// Local fallback paths (available in sandbox/dev, may not exist in production)
const LOCAL_SERIF = "/usr/share/fonts/truetype/noto/NotoSerif-Regular.ttf";
const LOCAL_SANS = "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf";
const LOCAL_TANGRAM = "/home/ubuntu/webdev-static-assets/tangram.png";

// Process-lifetime temp file paths for fonts (written once, reused)
let serifTmpPath: string | null = null;
let sansTmpPath: string | null = null;

// In-memory buffer cache for the tangram PNG
let tangramBuffer: Buffer | null = null;

function fetchBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    client
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Failed to fetch ${url}: HTTP ${res.statusCode}`));
          return;
        }
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", reject);
      })
      .on("error", reject);
  });
}

async function loadFontToTmpFile(
  cdnUrl: string,
  localPath: string,
  suffix: string
): Promise<string> {
  const tmpPath = path.join(os.tmpdir(), `lw_font_${suffix}_${process.pid}.ttf`);
  if (fs.existsSync(tmpPath)) return tmpPath;

  let buf: Buffer;
  if (fs.existsSync(localPath)) {
    buf = fs.readFileSync(localPath);
  } else {
    buf = await fetchBuffer(cdnUrl);
  }
  fs.writeFileSync(tmpPath, buf);
  return tmpPath;
}

async function loadTangram(): Promise<Buffer> {
  if (tangramBuffer) return tangramBuffer;
  if (fs.existsSync(LOCAL_TANGRAM)) {
    tangramBuffer = fs.readFileSync(LOCAL_TANGRAM);
  } else {
    tangramBuffer = await fetchBuffer(TANGRAM_URL);
  }
  return tangramBuffer;
}

async function ensureFonts(): Promise<{ serifPath: string; sansPath: string }> {
  if (!serifTmpPath) {
    serifTmpPath = await loadFontToTmpFile(SERIF_FONT_URL, LOCAL_SERIF, "serif");
  }
  if (!sansTmpPath) {
    sansTmpPath = await loadFontToTmpFile(SANS_FONT_URL, LOCAL_SANS, "sans");
  }
  return { serifPath: serifTmpPath, sansPath: sansTmpPath };
}

/**
 * Compose a 1080×1080 Navy Frame image.
 *
 * @param photoBuffer  Raw bytes of the inner photograph (any format sharp accepts)
 * @param categoryLabel  e.g. "STRENGTHS", "REFLECTIONS", "IN PRACTICE", "LIFELINE"
 * @returns  PNG buffer of the composited 1080×1080 image
 */
export async function composeNavyFrame(
  photoBuffer: Buffer,
  categoryLabel: string
): Promise<Buffer> {
  // Canvas constants
  const W = 1080;
  const H = 1080;
  const RAIL_H = 200;
  const PHOTO_W = 960;
  const PHOTO_H = 820;
  const PHOTO_X = Math.round((W - PHOTO_W) / 2); // 60
  const PHOTO_Y = 30;
  const TANGRAM_SIZE = 90;
  const TANGRAM_X = 60;
  const TANGRAM_Y = Math.round(H - RAIL_H + (RAIL_H - TANGRAM_SIZE) / 2);

  // Rail vertical centre
  const railCenterY = H - RAIL_H + Math.round(RAIL_H / 2);

  // Load fonts and tangram
  const { serifPath, sansPath } = await ensureFonts();
  const tgramBuf = await loadTangram();

  // ── Wordmark: "Lifework" in NotoSerif, ~72px tall ──────────────────────────
  const WORDMARK_H = 72;
  const wordmarkRaw = await sharp({
    text: {
      text: '<span foreground="#f5f0e8" font_family="NotoSerif">Lifework</span>',
      fontfile: serifPath,
      rgba: true,
      dpi: 300,
    },
  } as Parameters<typeof sharp>[0])
    .png()
    .toBuffer();
  const wMeta = await sharp(wordmarkRaw).metadata();
  const wordmarkW = Math.round(wMeta.width! * (WORDMARK_H / wMeta.height!));
  const wordmarkFinal = await sharp(wordmarkRaw)
    .resize(wordmarkW, WORDMARK_H)
    .png()
    .toBuffer();

  // ── Category label: NotoSans, ~32px tall, letter-spaced ────────────────────
  const LABEL_H = 32;
  const labelRaw = await sharp({
    text: {
      text: `<span foreground="#f5f0e8" letter_spacing="3000" font_family="NotoSans">${categoryLabel}</span>`,
      fontfile: sansPath,
      rgba: true,
      dpi: 300,
    },
  } as Parameters<typeof sharp>[0])
    .png()
    .toBuffer();
  const lMeta = await sharp(labelRaw).metadata();
  const labelW = Math.round(lMeta.width! * (LABEL_H / lMeta.height!));
  const labelFinal = await sharp(labelRaw)
    .resize(labelW, LABEL_H)
    .png()
    .toBuffer();

  // ── Tangram mark: 90×90px ───────────────────────────────────────────────────
  const tangramFinal = await sharp(tgramBuf)
    .resize(TANGRAM_SIZE, TANGRAM_SIZE)
    .png()
    .toBuffer();

  // ── Inner photo: 960×820px, cover crop ─────────────────────────────────────
  const photoFinal = await sharp(photoBuffer)
    .resize(PHOTO_W, PHOTO_H, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();

  // ── Composite positions ─────────────────────────────────────────────────────
  const wordmarkTop = railCenterY - Math.round(WORDMARK_H / 2);
  const wordmarkLeft = TANGRAM_X + TANGRAM_SIZE + 24;
  const labelTop = railCenterY - Math.round(LABEL_H / 2);
  const labelLeft = W - 60 - labelW;

  // ── Final composite ─────────────────────────────────────────────────────────
  return sharp({
    create: {
      width: W,
      height: H,
      channels: 4,
      background: { r: 26, g: 39, b: 68, alpha: 1 },
    },
  })
    .composite([
      { input: photoFinal, top: PHOTO_Y, left: PHOTO_X },
      { input: tangramFinal, top: TANGRAM_Y, left: TANGRAM_X },
      { input: wordmarkFinal, top: wordmarkTop, left: wordmarkLeft },
      { input: labelFinal, top: labelTop, left: labelLeft },
    ])
    .png()
    .toBuffer();
}
