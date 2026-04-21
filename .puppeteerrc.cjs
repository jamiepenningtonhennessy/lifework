/**
 * Puppeteer configuration.
 * Sets the cache directory explicitly so that both the postinstall
 * browser download and runtime Chrome discovery use the same path,
 * regardless of whether the process runs as root or a named user.
 */
const { join } = require("path");

/** @type {import("puppeteer").Configuration} */
module.exports = {
  // Store Chrome in a project-relative directory so it survives
  // across container deployments and is predictable at runtime.
  cacheDirectory: join(__dirname, ".cache", "puppeteer"),
};
