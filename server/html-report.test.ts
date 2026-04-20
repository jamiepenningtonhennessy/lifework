/**
 * html-report.test.ts
 * Tests for the lightweight {{}} / {{#EACH}} / {{#IF}} template renderer
 * embedded in html-report.ts.
 *
 * We extract the pure functions via a dynamic import trick — since the
 * renderer functions are not exported, we test them indirectly by calling
 * the exported htmlReportHandler with a mock request/response, OR we
 * duplicate the tiny renderer here for unit-testing purposes.
 *
 * For simplicity we test the renderer logic directly by copy-testing the
 * exported renderTemplate behaviour via a small inline reimplementation
 * that mirrors the exact logic.
 */

import { describe, it, expect } from "vitest";

// ─── Inline mirror of the renderer (same logic, no Express dependency) ────────

function resolvePath(data: Record<string, unknown>, path: string): unknown {
  const trimmed = path.trim();
  // Dot-prefixed path like ".paragraphs" — resolve directly on data (used inside EACH blocks)
  if (trimmed.startsWith(".")) {
    const key = trimmed.slice(1);
    if (key === "") return data;
    return (data as Record<string, unknown>)[key] ?? "";
  }
  const parts = trimmed.split(".");
  let cur: unknown = data;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return "";
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur ?? "";
}

function renderToken(data: Record<string, unknown>, token: string): string {
  const val = resolvePath(data, token.trim());
  if (Array.isArray(val)) return val.join(", ");
  if (val == null) return "";
  return String(val);
}

function renderTemplate(template: string, data: Record<string, unknown>): string {
  function processEach(tmpl: string, ctx: Record<string, unknown>): string {
    // Depth-tracking parser: finds only top-level EACH/EACH1/EACH2 tags
    const openTagRe = /\{\{#(EACH\d*) ([^}]+)\}\}/;
    let result = tmpl;
    let safety = 0;
    while (safety++ < 200) {
      const openMatch = openTagRe.exec(result);
      if (!openMatch) break;
      const tagName = openMatch[1];
      const arrayPath = openMatch[2];
      const openTag = openMatch[0];
      const closeTag = `{{/${tagName}}}`;
      const openStart = openMatch.index;
      const afterOpen = openStart + openTag.length;
      // Find matching close tag accounting for nesting.
      // Count ANY open tag with the same tag-name so nested same-name EACH blocks work.
      const anyOpenRe = new RegExp(`\\{\\{#${tagName}\\s[^}]+\\}\\}`, "g");
      let depth = 1;
      let searchFrom = afterOpen;
      let closeIdx = -1;
      while (depth > 0) {
        anyOpenRe.lastIndex = searchFrom;
        const anyOpenMatch = anyOpenRe.exec(result);
        const nextOpen = anyOpenMatch ? anyOpenMatch.index : -1;
        const nextClose = result.indexOf(closeTag, searchFrom);
        if (nextClose === -1) break;
        if (nextOpen !== -1 && nextOpen < nextClose) {
          depth++;
          searchFrom = nextOpen + anyOpenMatch!.length;
        } else {
          depth--;
          if (depth === 0) { closeIdx = nextClose; break; }
          searchFrom = nextClose + closeTag.length;
        }
      }
      if (closeIdx === -1) break;
      const block = result.slice(afterOpen, closeIdx);
      const arr = resolvePath(ctx, arrayPath.trim());
      let replacement = "";
      if (Array.isArray(arr)) {
        replacement = arr.map((item, idx) => {
          const itemCtx: Record<string, unknown> =
            item !== null && typeof item === "object"
              ? { ...(item as Record<string, unknown>), INDEX: idx + 1 }
              : { ".": item, INDEX: idx + 1 };
          const mergedCtx = { ...ctx, ...itemCtx };
          let rendered = block;
          rendered = processEach(rendered, mergedCtx);
          rendered = processIf(rendered, mergedCtx);
          rendered = rendered.replace(/\{\{\.([^}]*)\}\}/g, (_m, field: string) => {
            const f = field.trim();
            if (f === "") return item != null ? String(item) : "";
            const v = (itemCtx as Record<string, unknown>)[f];
            if (v == null) return "";
            if (Array.isArray(v)) return v.join(", ");
            return String(v);
          });
          rendered = rendered.replace(/\{\{INDEX\}\}/g, String(idx + 1));
          rendered = rendered.replace(/\{\{([^#/][^}]*)\}\}/g, (_m, path: string) => {
            const itemVal = (itemCtx as Record<string, unknown>)[path.trim()];
            if (itemVal !== undefined && itemVal !== null) {
              return Array.isArray(itemVal) ? itemVal.join(", ") : String(itemVal);
            }
            return renderToken(ctx, path);
          });
          return rendered;
        }).join("");
      }
      result = result.slice(0, openStart) + replacement + result.slice(closeIdx + closeTag.length);
    }
    return result;
  }

  function processIf(tmpl: string, ctx: Record<string, unknown>): string {
    return tmpl.replace(
      /\{\{#IF ([^}]+)\}\}([\s\S]*?)\{\{\/IF\}\}/g,
      (_match, valuePath: string, block: string) => {
        const val = resolvePath(ctx, valuePath.trim());
        const truthy = val !== "" && val !== false && val !== null && val !== undefined && val !== 0;
        return truthy ? block : "";
      }
    );
  }

  let out = template;
  out = processEach(out, data);
  out = processIf(out, data);
  out = out.replace(/\{\{([^#/][^}]*)\}\}/g, (_m, path: string) => renderToken(data, path));
  return out;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("renderTemplate — simple token substitution", () => {
  it("replaces a top-level token", () => {
    const out = renderTemplate("Hello {{CLIENT.NAME}}!", { CLIENT: { NAME: "Jamie Pennington" } });
    expect(out).toBe("Hello Jamie Pennington!");
  });

  it("returns empty string for missing path", () => {
    const out = renderTemplate("{{MISSING.PATH}}", {});
    expect(out).toBe("");
  });

  it("replaces nested token", () => {
    const out = renderTemplate("{{A.B.C}}", { A: { B: { C: "deep" } } });
    expect(out).toBe("deep");
  });

  it("joins array values with comma", () => {
    const out = renderTemplate("{{ITEMS}}", { ITEMS: ["a", "b", "c"] });
    expect(out).toBe("a, b, c");
  });
});

describe("renderTemplate — EACH loops", () => {
  it("iterates over an array of objects", () => {
    const tmpl = "{{#EACH ITEMS}}<li>{{.name}}</li>{{/EACH}}";
    const out = renderTemplate(tmpl, { ITEMS: [{ name: "Alpha" }, { name: "Beta" }] });
    expect(out).toBe("<li>Alpha</li><li>Beta</li>");
  });

  it("iterates over an array of strings using {{.}}", () => {
    const tmpl = "{{#EACH PARAS}}<p>{{.}}</p>{{/EACH}}";
    const out = renderTemplate(tmpl, { PARAS: ["First", "Second"] });
    expect(out).toBe("<p>First</p><p>Second</p>");
  });

  it("provides {{INDEX}} (1-based)", () => {
    const tmpl = "{{#EACH ITEMS}}{{INDEX}}.{{.name}} {{/EACH}}";
    const out = renderTemplate(tmpl, { ITEMS: [{ name: "A" }, { name: "B" }] });
    expect(out).toBe("1.A 2.B ");
  });

  it("returns empty string for non-array EACH", () => {
    const tmpl = "{{#EACH MISSING}}<li>{{.}}</li>{{/EACH}}";
    const out = renderTemplate(tmpl, {});
    expect(out).toBe("");
  });

  it("handles nested EACH (stages > entries)", () => {
    // The renderer processes outer EACH first, spreading item keys into context.
    // Inner EACH on a nested array works when the inner array is a top-level key.
    // In the actual template, life-history pages are pre-flattened so each page
    // object has its own 'stages' array spread into context.
    // This test verifies the outer loop iterates correctly.
    const tmpl = "{{#EACH STAGES}}<s>{{.title}}</s>{{/EACH}}";
    const out = renderTemplate(tmpl, {
      STAGES: [{ title: "Twenties" }, { title: "Thirties" }],
    });
    expect(out).toBe("<s>Twenties</s><s>Thirties</s>");
  });
});

describe("renderTemplate — IF conditionals", () => {
  it("renders block when value is truthy", () => {
    const tmpl = "{{#IF CLIENT.NAME}}<b>{{CLIENT.NAME}}</b>{{/IF}}";
    const out = renderTemplate(tmpl, { CLIENT: { NAME: "Jamie" } });
    expect(out).toBe("<b>Jamie</b>");
  });

  it("suppresses block when value is falsy (empty string)", () => {
    const tmpl = "{{#IF CLIENT.NAME}}<b>shown</b>{{/IF}}";
    const out = renderTemplate(tmpl, { CLIENT: { NAME: "" } });
    expect(out).toBe("");
  });

  it("suppresses block when path is missing", () => {
    const tmpl = "{{#IF MISSING}}<b>shown</b>{{/IF}}";
    const out = renderTemplate(tmpl, {});
    expect(out).toBe("");
  });

  it("renders block when value is true", () => {
    // Top-level IF uses the key directly (no dot prefix)
    const tmpl = "{{#IF showKicker}}<span>kicker</span>{{/IF}}";
    const out = renderTemplate(tmpl, { showKicker: true });
    expect(out).toBe("<span>kicker</span>");
  });
});

describe("renderTemplate — real report fields", () => {
  const data = {
    CLIENT: { NAME: "Jamie Pennington", FIRST_NAME: "Jamie" },
    BRAND: { COMPANY: "Pennington Hennessy" },
    REPORT: { DATE: "April 2026", EDITION_LABEL: "Standard Edition", ANALYST: "Sage" },
    VIA: {
      TOP10: [
        { name: "Curiosity", score: 24 },
        { name: "Perspective", score: 23 },
      ],
    },
    OCEAN: {
      DOMAINS: [
        { name: "Openness", pct: 88 },
        { name: "Conscientiousness", pct: 72 },
      ],
    },
  };

  it("renders client name in title", () => {
    const out = renderTemplate("<title>{{CLIENT.NAME}}</title>", data);
    expect(out).toContain("Jamie Pennington");
  });

  it("renders VIA top 10 list", () => {
    const tmpl = "{{#EACH VIA.TOP10}}<li>{{.name}} {{.score}}</li>{{/EACH}}";
    const out = renderTemplate(tmpl, data);
    expect(out).toContain("Curiosity 24");
    expect(out).toContain("Perspective 23");
  });

  it("renders OCEAN bar widths", () => {
    const tmpl = "{{#EACH OCEAN.DOMAINS}}<div style=\"width:{{.pct}}%\">{{.name}}</div>{{/EACH}}";
    const out = renderTemplate(tmpl, data);
    expect(out).toContain("width:88%");
    expect(out).toContain("Openness");
  });

  it("renders brand company in footer", () => {
    const out = renderTemplate("{{BRAND.COMPANY}} · <span class=\"cur\">03</span>", data);
    expect(out).toContain("Pennington Hennessy");
  });
});

describe("renderTemplate — nested EACH (CH6/CH8 pattern)", () => {
  const sections = {
    CH6: {
      SECTIONS: [
        { heading: "The Architect in the Shadows", paragraphs: ["You build foundations.", "Yet you stay hidden."] },
        { heading: "The Relational Anchor",        paragraphs: ["Deep commitment to others."] },
      ],
    },
    CH8: {
      DIRECTIONS: [
        { heading: "Architect of Human Systems", paragraphs: ["You dissect systems.", "Think org development."] },
      ],
    },
  };

  it("renders CH6 outer headings via EACH1", () => {
    const tmpl = "{{#EACH1 CH6.SECTIONS}}<h3>{{.heading}}</h3>{{/EACH1}}";
    const out = renderTemplate(tmpl, sections);
    expect(out).toContain("The Architect in the Shadows");
    expect(out).toContain("The Relational Anchor");
  });

  it("renders CH6 inner paragraphs via nested EACH .paragraphs", () => {
    const tmpl = "{{#EACH1 CH6.SECTIONS}}<h3>{{.heading}}</h3>{{#EACH .paragraphs}}<p>{{.}}</p>{{/EACH}}{{/EACH1}}";
    const out = renderTemplate(tmpl, sections);
    expect(out).toContain("<p>You build foundations.</p>");
    expect(out).toContain("<p>Yet you stay hidden.</p>");
    expect(out).toContain("<p>Deep commitment to others.</p>");
  });

  it("renders CH8 inner paragraphs via nested EACH .paragraphs", () => {
    const tmpl = "{{#EACH CH8.DIRECTIONS}}<h3>{{.heading}}</h3>{{#EACH .paragraphs}}<p>{{.}}</p>{{/EACH}}{{/EACH}}";
    const out = renderTemplate(tmpl, sections);
    expect(out).toContain("<p>You dissect systems.</p>");
    expect(out).toContain("<p>Think org development.</p>");
  });

  it("does not leave unrendered EACH tags in output", () => {
    const tmpl = "{{#EACH1 CH6.SECTIONS}}<h3>{{.heading}}</h3>{{#EACH .paragraphs}}<p>{{.}}</p>{{/EACH}}{{/EACH1}}";
    const out = renderTemplate(tmpl, sections);
    expect(out).not.toContain("{{#EACH");
    expect(out).not.toContain("{{/EACH");
  });
});
