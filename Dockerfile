# The Quiet Authority report renderer needs a real browser and shared libraries.
# Installing Chromium via apt also installs GLib, NSS, GTK/Pango and its other
# runtime dependencies; downloading Chrome alone does not provide those libraries.
FROM node:22-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        chromium \
        ca-certificates \
        fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

# Use the apt-managed binary, never a stale project cache in the deployed image.
ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /usr/src/app
COPY . .

# The full frontend AND server build must run inside this image. Keep
# node_modules because the server bundles its dependencies as externals.
RUN npm install -g corepack@latest \
    && corepack pnpm install --frozen-lockfile \
    && corepack pnpm run build \
    && node scripts/check-report-browser.mjs

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/index.js"]
