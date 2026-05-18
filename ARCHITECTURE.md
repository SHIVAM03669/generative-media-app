# GenCanvas — Architecture & Delivery Notes

## 1. High-level architecture (text diagram)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Browser (Vite + React SPA)                       │
├─────────────────────────────────────────────────────────────────────────┤
│  App.jsx                                                                 │
│    ├── PromptForm.jsx  ── prompt + provider/settings ──► onSubmit       │
│    ├── Gallery.jsx     ◄── generations[] ── Tweak / Canvas / Delete     │
│    └── Canvas.jsx      ◄── selected item ── 2D filters + save PNG       │
│              │                    ▲                                      │
│              │ generateImage()    │ load / save / update                 │
│              ▼                    │                                      │
│    services/api/index.js  ◄── SINGLE SWAP POINT (mock | real)           │
│              │                                                           │
│      ┌───────┴────────┐                                                  │
│      ▼                ▼                                                  │
│  mockApi.js      realApi.js                                              │
│  (delay +        ├── falService.js ──► queue.fal.run (Flux Schnell)      │
│   picsum)        └── hfService.js  ──► api-inference.huggingface.co    │
│                                                                          │
│    utils/persistence.js (IndexedDB: generations store)                   │
│    utils/errors.js      (429 / 503 / auth → user messages)               │
└─────────────────────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
   [Fal.ai API]                  [Hugging Face Inference API]
   VITE_FAL_KEY                  VITE_HF_TOKEN
```

**Data flow:** User submits prompt → `generateImage` → image URL (or data URL from HF) → `saveGeneration` → gallery re-renders → optional Canvas tweak persists filter state + PNG data URL back to IndexedDB.

---

## 2. Source layout

| File | Role |
|------|------|
| `src/App.jsx` | Root state, orchestration, generate / tweak / delete |
| `src/components/PromptForm.jsx` | Prompt, provider, size, steps |
| `src/components/Gallery.jsx` | History grid with metadata + actions |
| `src/components/Canvas.jsx` | Client-side filter tweaks on `<canvas>` |
| `src/services/api/index.js` | **One import** toggles mock vs live |
| `src/services/api/mockApi.js` | Simulated latency + deterministic placeholder |
| `src/services/api/realApi.js` | Routes to Fal or HF by `settings.provider` |
| `src/services/falService.js` | Fal queue + poll |
| `src/services/hfService.js` | HF inference blob → data URL |
| `src/utils/persistence.js` | IndexedDB CRUD |
| `src/utils/errors.js` | Friendly API errors |

---

## 3. Trade-offs & decisions (~250 words)

**State management:** Plain React hooks in `App.jsx` only—no Redux or Zustand. Generation list is the single source of truth, hydrated once from IndexedDB. That fits a one-day slice: few cross-cutting concerns, easy to trace.

**Persistence:** IndexedDB over `localStorage` so HF responses (data URLs) and canvas exports do not blow the ~5MB string cap. Schema is a single `generations` object store keyed by `id`.

**API strategy:** Fal (`flux/schnell`, low step count) and HF SDXL are split into dedicated modules; `realApi.js` only routes. Default export in `services/api/index.js` points at `mockApi.js` so the app runs without keys. Switching to production calls is literally changing that one re-export to `realApi.js`. `VITE_USE_MOCK` is documented for forcing mock during demos.

**Free tier:** HF prompts capped at 500 chars; inference steps capped (30 HF, 8 Fal). Errors map 429/503 to actionable copy. Mock delay (1.8–4.2s) mimics queue latency.

**What we cut:** Auth, cloud storage, inpainting/outpainting, multi-image batches, server proxy (keys stay client-side for the slice—document that production should proxy), advanced canvas (layers, masks, text). Gallery has no pagination. No unit tests in the day budget.

**Canvas:** CSS filters via canvas 2D `ctx.filter`—enough to demonstrate “tweak on canvas” without Fabric/Konva.

---

## 4. Run locally

```bash
npm install
cp .env.example .env
# Optional: set VITE_FAL_KEY / VITE_HF_TOKEN and change api/index.js to realApi.js
npm run dev
```

**Live APIs:** In `src/services/api/index.js`, change the export to `./realApi.js` and add keys to `.env`.
