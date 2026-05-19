/**
 * Navy Frame compositor — pure Node.js/sharp implementation.
 *
 * Replaces the Python/PIL compositor so the image pipeline works in the
 * deployed production container (which does not have Python or Pillow).
 *
 * Canvas: 1080×1080px
 * - Outer frame: navy #1a2744, full bleed
 * - Inner photo: 960×820px, centred horizontally, 30px from top
 * - Bottom rail: 200px, navy, full width
 * - Tangram mark: 90×90px, left edge of rail (x=60)
 * - Lifework wordmark: NotoSerif 90pt, cream #f5f0e8, after tangram
 * - Category label: NotoSans 38pt, cream, right-aligned, letter-spaced
 *
 * Fonts are embedded as base64 inside the SVG overlay so they render
 * correctly even when system fonts are unavailable in the container.
 * Font files are fetched once from CDN and cached in memory.
 */

import sharp from "sharp";
import * as fs from "fs";
import * as https from "https";
import * as http from "http";

// CDN URLs for fonts (uploaded as static webdev assets — never expire)
const SERIF_FONT_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/107696804/kFbbE6kqNApXGDFpQJUGV7/NotoSerif-Regular_060c2d57.ttf";
const SANS_FONT_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/107696804/kFbbE6kqNApXGDFpQJUGV7/NotoSans-Regular_b64a5eb9.ttf";
const TANGRAM_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/107696804/kFbbE6kqNApXGDFpQJUGV7/tangram_ec333843.png";

// In-memory cache so we only fetch each asset once per server process
const assetCache = new Map<string, Buffer>();

function fetchBuffer(url: string): Promise<Buffer> {
  const cached = assetCache.get(url);
  if (cached) return Promise.resolve(cached);

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
        res.on("end", () => {
          const buf = Buffer.concat(chunks);
          assetCache.set(url, buf);
          resolve(buf);
        });
        res.on("error", reject);
      })
      .on("error", reject);
  });
}

// Fallback: try to load fonts from local filesystem paths if CDN fetch fails
const LOCAL_SERIF = "/usr/share/fonts/truetype/noto/NotoSerif-Regular.ttf";
const LOCAL_SANS = "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf";
const LOCAL_TANGRAM = "/home/ubuntu/webdev-static-assets/tangram.png";

async function loadAsset(url: string, localPath: string): Promise<Buffer> {
  try {
    return await fetchBuffer(url);
  } catch {
    if (fs.existsSync(localPath)) {
      const buf = fs.readFileSync(localPath);
      assetCache.set(url, buf);
      return buf;
    }
    throw new Error(`Could not load asset from ${url} or ${localPath}`);
  }
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

  // Rail text vertical centre
  const railCenterY = H - RAIL_H + RAIL_H / 2;
  // Approximate baseline for 90pt font (cap-height ~65% of em, baseline ~72% from top of em)
  const wordmarkBaseline = Math.round(railCenterY + 32);
  const wordmarkX = TANGRAM_X + TANGRAM_SIZE + 22;
  const labelX = W - 60;
  const labelY = wordmarkBaseline;

  // Load assets (with CDN → local fallback)
  const [serifBuf, sansBuf, tangramBuf] = await Promise.all([
    loadAsset(SERIF_FONT_URL, LOCAL_SERIF),
    loadAsset(SANS_FONT_URL, LOCAL_SANS),
    loadAsset(TANGRAM_URL, LOCAL_TANGRAM),
  ]);

  const serifB64 = serifBuf.toString("base64");
  const sansB64 = sansBuf.toString("base64");

  // Resize the inner photo
  const resizedPhoto = await sharp(photoBuffer)
    .resize(PHOTO_W, PHOTO_H, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();

  // Resize the tangram mark
  const resizedTangram = await sharp(tangramBuf)
    .resize(TANGRAM_SIZE, TANGRAM_SIZE)
    .png()
    .toBuffer();

  // Build SVG overlay for text (fonts embedded as base64 so they work in any container)
  const overlaySvg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @font-face { font-family: 'NotoSerif'; src: url('data:font/truetype;base64,${serifB64}'); }
      @font-face { font-family: 'NotoSans'; src: url('data:font/truetype;base64,${sansB64}'); }
    </style>
  </defs>
  <text x="${wordmarkX}" y="${wordmarkBaseline}" font-family="NotoSerif" font-size="90" fill="#f5f0e8">Lifework</text>
  <text x="${labelX}" y="${labelY}" font-family="NotoSans" font-size="38" fill="#f5f0e8" text-anchor="end" letter-spacing="4">${categoryLabel}</text>
</svg>`;

  // Composite all layers onto the navy background
  const result = await sharp({
    create: {
      width: W,
      height: H,
      channels: 4,
      background: { r: 26, g: 39, b: 68, alpha: 1 },
    },
  })
    .composite([
      // Inner photo
      { input: resizedPhoto, top: PHOTO_Y, left: PHOTO_X },
      // Tangram mark
      { input: resizedTangram, top: TANGRAM_Y, left: TANGRAM_X },
      // Text overlay (SVG with embedded fonts)
      { input: Buffer.from(overlaySvg), top: 0, left: 0 },
    ])
    .png()
    .toBuffer();

  return result;
}
