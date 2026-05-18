export default function PromptForm({
  prompt,
  settings,
  loading,
  error,
  apiMode,
  onPromptChange,
  onSettingsChange,
  onSubmit,
}) {
  return (
    <form
      className="prompt-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="prompt-form__header">
        <h2>Create</h2>
        <span
          className={`badge${apiMode.startsWith('mock') ? ' badge--warn' : ' badge--live'}`}
          title="Hugging Face via local dev proxy"
        >
          {apiMode}
        </span>
      </div>

      {apiMode.startsWith('mock') && (
        <p className="form-hint">
          Mock mode shows random stock photos, not your prompt. Set{' '}
          <code>VITE_HF_TOKEN</code>, <code>VITE_USE_MOCK=false</code>, then restart{' '}
          <code>npm run dev</code>.
        </p>
      )}

      <label className="field">
        <span>Prompt</span>
        <textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder="A serene mountain lake at golden hour, cinematic lighting…"
          rows={4}
          disabled={loading}
          maxLength={500}
        />
      </label>

      <label className="field">
        <span>
          Steps{' '}
          <abbr title="How many denoising passes the model runs. More steps = sharper detail but slower. Try 20–30 for FLUX.">
            (?)
          </abbr>
        </span>
        <input
          type="number"
          min={1}
          max={30}
          value={settings.steps}
          onChange={(e) =>
            onSettingsChange({ steps: Number(e.target.value) || 25 })
          }
          disabled={loading}
        />
        <span className="field-help">
          Denoising passes: higher = more detail, slower generation (free tier max 30).
        </span>
      </label>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <button type="submit" className="btn btn-primary" disabled={loading || !prompt.trim()}>
        {loading ? 'Generating…' : 'Generate'}
      </button>
    </form>
  );
}
