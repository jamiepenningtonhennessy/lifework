import * as fs from "fs";

// Read the composite we already generated
const compositeBuffer = fs.readFileSync("/tmp/test_composite.png");
console.log("Composite buffer size:", compositeBuffer.length);

// Import storagePut
const { storagePut } = await import("./server/storage.ts");
try {
  const { url } = await storagePut(
    `blog-images/test-${Date.now()}.png`,
    compositeBuffer,
    "image/png"
  );
  console.log("S3 upload OK:", url?.substring(0, 80));
} catch(e) {
  console.error("S3 upload ERROR:", e.message);
  console.error(e.stack);
}
