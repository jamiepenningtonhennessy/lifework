import type { Express } from "express";
import { ENV } from "./env";

/**
 * Serves private WebDev media paths by resolving a short-lived signed download
 * URL server-side. This keeps the Forge credential out of the browser.
 */
export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as { 0?: string })[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }

    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);
      const forgeResponse = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });

      if (!forgeResponse.ok) {
        const body = await forgeResponse.text().catch(() => "");
        console.error(`[StorageProxy] Forge error: ${forgeResponse.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }

      const { url } = (await forgeResponse.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from storage backend");
        return;
      }

      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (error) {
      console.error("[StorageProxy] Failed:", error);
      res.status(502).send("Storage proxy error");
    }
  });
}
