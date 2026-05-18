import { useCallback, useEffect, useState } from 'react';
import PromptForm from './components/PromptForm.jsx';
import Gallery from './components/Gallery.jsx';
import Canvas from './components/Canvas.jsx';
import { generateImage, getApiMode } from './services/api/index.js';
import {
  loadGenerations,
  saveGeneration,
  updateGeneration,
  deleteGeneration,
} from './utils/persistence.js';
import { friendlyApiError } from './utils/errors.js';
import {
  createGeneration,
  GENERATION_STATUS,
  isActiveStatus,
  nextDisplayIndex,
} from './models/generation.js';

const DEFAULT_SETTINGS = { steps: 25 };

function createId() {
  return crypto.randomUUID?.() ?? `gen-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export default function App() {
  const [generations, setGenerations] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [error, setError] = useState('');
  const [canvasItem, setCanvasItem] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const [tweakSource, setTweakSource] = useState(null);

  useEffect(() => {
    loadGenerations()
      .then(setGenerations)
      .catch(() => setError('Could not load saved generations.'))
      .finally(() => setHydrated(true));
  }, []);

  const patchGeneration = useCallback(async (id, patch) => {
    const updated = await updateGeneration(id, patch);
    if (updated) {
      setGenerations((prev) => prev.map((g) => (g.id === id ? updated : g)));
      setCanvasItem((c) => (c?.id === id ? updated : c));
    }
    return updated;
  }, []);

  const runJob = useCallback(
    async (id, trimmedPrompt, jobSettings) => {
      await patchGeneration(id, { status: GENERATION_STATUS.QUEUED, errorMessage: undefined });
      await sleep(400);
      await patchGeneration(id, { status: GENERATION_STATUS.GENERATING });

      try {
        const result = await generateImage(trimmedPrompt, jobSettings);
        const done = await patchGeneration(id, {
          status: GENERATION_STATUS.DONE,
          imageUrl: result.imageUrl,
          sourceImageUrl: result.imageUrl,
          model: result.model,
          mocked: result.mocked ?? false,
          provider: result.provider ?? 'huggingface',
        });
        if (done) setCanvasItem(done);
      } catch (err) {
        await patchGeneration(id, {
          status: GENERATION_STATUS.FAILED,
          errorMessage: friendlyApiError(err),
        });
      }
    },
    [patchGeneration]
  );

  const startGeneration = useCallback(
    async (trimmedPrompt, jobSettings, parentMeta = null) => {
      const id = createId();
      setGenerations((prev) => {
        const item = createGeneration({
          id,
          displayIndex: nextDisplayIndex(prev),
          prompt: trimmedPrompt,
          settings: jobSettings,
          parentId: parentMeta?.id ?? null,
          parentDisplayIndex: parentMeta?.displayIndex ?? null,
        });
        saveGeneration(item);
        return [item, ...prev];
      });

      await runJob(id, trimmedPrompt, jobSettings);
      setTweakSource(null);
    },
    [runJob]
  );

  const handleSettingsChange = useCallback((patch) => {
    setSettings((s) => ({ ...s, ...patch }));
  }, []);

  const handleGenerate = useCallback(() => {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    setError('');
    startGeneration(trimmed, { ...settings }, tweakSource);
  }, [prompt, settings, tweakSource, startGeneration]);

  const handleTweak = useCallback((item, allItems) => {
    setPrompt(item.prompt);
    setSettings({ ...DEFAULT_SETTINGS, ...item.settings });
    const list = allItems ?? generations;
    const sorted = [...list].sort((a, b) => a.createdAt - b.createdAt);
    const chronological = sorted.findIndex((g) => g.id === item.id) + 1;
    const label =
      typeof item.displayIndex === 'number' && item.displayIndex > 0
        ? item.displayIndex
        : chronological > 0
          ? chronological
          : 1;
    setTweakSource({ id: item.id, displayIndex: label });
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [generations]);

  const handleRetry = useCallback(
    (item) => {
      runJob(item.id, item.prompt, item.settings ?? DEFAULT_SETTINGS);
    },
    [runJob]
  );

  const handleSaveTweak = useCallback(
    async (id, payload) => {
      const patch = {
        status: GENERATION_STATUS.DONE,
        sourceImageUrl: payload.sourceImageUrl,
      };
      if (payload.canvasTweak === null) {
        patch.canvasTweak = null;
        patch.imageUrl = payload.sourceImageUrl;
      } else {
        patch.canvasTweak = {
          filters: payload.filters,
          crop: payload.crop,
          textOverlay: payload.textOverlay,
          previewDataUrl: payload.previewDataUrl,
        };
        patch.imageUrl = payload.previewDataUrl ?? payload.sourceImageUrl;
        if (!patch.sourceImageUrl) {
          const existing = generations.find((g) => g.id === id);
          patch.sourceImageUrl = existing?.sourceImageUrl ?? existing?.imageUrl;
        }
      }
      const updated = await updateGeneration(id, patch);
      if (updated) {
        setGenerations((prev) => prev.map((g) => (g.id === id ? updated : g)));
        setCanvasItem(updated);
      }
    },
    []
  );

  const handleDelete = useCallback(async (id) => {
    await deleteGeneration(id);
    setGenerations((prev) => prev.filter((g) => g.id !== id));
    setCanvasItem((c) => (c?.id === id ? null : c));
    setTweakSource((t) => (t?.id === id ? null : t));
  }, []);

  const hasActiveJobs = generations.some((g) => isActiveStatus(g.status));

  if (!hydrated) {
    return (
      <div className="app app--loading">
        <p>Loading GenCanvas…</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>GenCanvas</h1>
        <p>Generate, browse, and tweak images from text prompts.</p>
      </header>

      <main className="app-layout">
        <aside className="app-sidebar">
          {tweakSource && (
            <p className="tweak-banner">
              Tweaking from <strong>#{tweakSource.displayIndex}</strong> — edit the prompt, then
              Generate.
            </p>
          )}
          <PromptForm
            prompt={prompt}
            settings={settings}
            loading={hasActiveJobs}
            error={error}
            apiMode={getApiMode()}
            onPromptChange={setPrompt}
            onSettingsChange={handleSettingsChange}
            onSubmit={handleGenerate}
          />
        </aside>

        <div className="app-main">
          <Gallery
            items={generations}
            activeId={canvasItem?.id}
            onTweak={handleTweak}
            onOpenCanvas={setCanvasItem}
            onDelete={handleDelete}
            onRetry={handleRetry}
          />
          <Canvas
            item={canvasItem?.status === GENERATION_STATUS.DONE ? canvasItem : null}
            onSaveTweak={handleSaveTweak}
            onClose={() => setCanvasItem(null)}
          />
        </div>
      </main>
    </div>
  );
}
