# LifeWorks Platform — Design Documents

**Purpose.** This document set is written for the engineering team designing the new Jobs / Opportunities module. It describes the existing platform in enough depth that the new feature can be built to look, feel, and behave as a native part of LifeWorks — not a bolt-on.

**Scope.** These documents cover the substrate, architecture, data model, client journey, UI/design system, and recommended integration approach. They do not contain any real client data. Where Maz's own LifeWorks profile is referenced for illustration, it is used as a concrete example of the data shapes and report structure a real client produces.

---

## Document Index

| File | Contents |
|---|---|
| `01-substrate.md` | What LifeWorks is built on, how it is hosted, and what makes adding features easy or hard |
| `02-architecture.md` | End-to-end architecture map with Mermaid diagram |
| `03-data-model.md` | Full data model, persistence rules, and the no-retained-data constraint |
| `04-client-journey.md` | Step-by-step client journey with natural insertion point for the Jobs module |
| `05-ui-design-system.md` | Design language, tokens, component library, typography, layout patterns |
| `06-integration-approach.md` | Integration surfaces and recommended approach for adding the Jobs module |

---

## Platform in One Sentence

LifeWorks is a **Manus-native, full-stack web application** — React 19 front end, Express 4 / tRPC 11 back end, MySQL database, S3 file storage, and Claude Sonnet as the AI engine — deployed on Google Cloud Run and served at `lifework.manus.space`. It is not embedded in any third-party no-code platform.

---

## Key Facts for the Engineering Team

- **Single codebase, single process.** The front end (Vite/React) and back end (Express/tRPC) are built together and served from one Node.js process. There is no separate API service.
- **Type-safe end to end.** All client–server communication uses tRPC with Zod schemas. There are no REST routes, no Axios wrappers, and no shared contract files outside the tRPC router type.
- **AI is server-side only.** All LLM calls go through a single `invokeLLM()` helper on the server. The model is Claude Sonnet 4.5, routed through the Manus Forge proxy. No AI key is ever exposed to the browser.
- **Data is persisted.** Despite a "no retained data" principle in the client-facing messaging, all psychometric results, life history data, and generated reports are stored in a MySQL/TiDB database and in S3. The constraint is about *sharing* data with third parties, not about ephemeral storage.
- **Auth is Manus OAuth.** Clients log in via Manus OAuth. The counsellor dashboard has a separate PIN gate on top of OAuth.
- **PDF generation uses WeasyPrint.** The WOW report PDF is rendered from HTML/CSS by WeasyPrint (a Python library installed at server startup). This is the only non-Node dependency in the runtime.
