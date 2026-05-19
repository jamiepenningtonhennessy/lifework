import { config } from "dotenv";
config({ path: "/home/ubuntu/plum-trees/.env" });
import * as fs from "fs";
import * as path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
const execFileAsync = promisify(execFile);

const forgeUrl = process.env.BUILT_IN_FORGE_API_URL;
const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;
const baseUrl = forgeUrl.endsWith("/") ? forgeUrl : `${forgeUrl}/`;
const fullUrl = new URL("images.v1.ImageService/GenerateImage", baseUrl).toString();

console.log("Step 1: Generating photo...");
const resp = await fetch(fullUrl, {
  method: "POST",
  headers: {
    "accept": "application/json",
    "content-type": "application/json",
    "connect-protocol-version": "1",
    "authorization": `Bearer ${forgeKey}`
  },
  body: JSON.stringify({ prompt: "A person sitting by a window, warm light, documentary style", original_images: [] })
});
console.log("Photo API status:", resp.status);
const data = await resp.json();
const photoBuffer = Buffer.from(data.image.b64Json, "base64");

const photoPath = "/tmp/test_photo.png";
const outputPath = "/tmp/test_composite.png";
fs.writeFileSync(photoPath, photoBuffer);
console.log("Photo saved:", photoPath, fs.statSync(photoPath).size, "bytes");

console.log("Step 2: Running compositor...");
const COMPOSE_SCRIPT = "/home/ubuntu/plum-trees/server/scripts/compose_navy_frame.py";
const TANGRAM_PATH = "/home/ubuntu/webdev-static-assets/tangram.png";
const SERIF_FONT = "/usr/share/fonts/truetype/noto/NotoSerif-Regular.ttf";
const SANS_FONT = "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf";

try {
  const result = await execFileAsync("python3.11", [
    COMPOSE_SCRIPT, photoPath, TANGRAM_PATH, SERIF_FONT, SANS_FONT, "STRENGTHS", outputPath
  ]);
  console.log("stdout:", result.stdout);
  console.log("stderr:", result.stderr);
  const exists = fs.existsSync(outputPath);
  console.log("Output:", outputPath, exists ? fs.statSync(outputPath).size + " bytes" : "MISSING");
} catch(e) {
  console.error("ERROR:", e.message);
  if (e.stderr) console.error("stderr:", e.stderr);
}
