# GenCanvas

A React-based generative image application that transforms text prompts into images using Hugging Face's Inference API. Features a complete workflow from prompt creation to gallery management to canvas-based image editing.

![GenCanvas Demo](https://via.placeholder.com/800x400/1a1a1a/ffffff?text=GenCanvas+Demo)

## ✨ Features

### 🎨 **Image Generation**
- Text-to-image generation via Hugging Face Inference API
- Support for FLUX.1-schnell and other diffusion models
- Configurable inference steps (1-30) for quality vs speed tradeoffs
- Real-time generation status tracking (queued → generating → done)

### 🖼️ **Gallery Management**
- Visual gallery with generation metadata and status badges
- Tweak lineage system - create variations from existing images
- Parent-child relationships with "↻ tweaked from #3" indicators
- Retry failed generations with one click
- Delete unwanted generations

### 🎛️ **Canvas Editor**
- **Adjust**: Brightness, contrast, and saturation filters
- **Crop**: Interactive drag-to-resize cropping with normalized coordinates
- **Text**: Add positioned text overlays with custom fonts, colors, and sizing
- Non-destructive editing - preserve original images
- Export edited images as high-quality PNG downloads

### 💾 **Persistence**
- Client-side localStorage with automatic IndexedDB migration
- Smart storage management with quota cleanup
- Compressed preview images to optimize storage usage
- Maintains complete generation history and lineage

### 🔧 **Developer Experience**
- Mock mode with deterministic placeholder images for development
- Vite dev proxy keeps API tokens secure server-side
- Hot reload and fast development builds
- Clean separation between mock and live API layers

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Hugging Face account with API token

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd gencanvas

# Install dependencies
npm install

# Set up environment
cp .env.example .env
```

### Configuration

Edit `.env` with your settings:

```bash
# Required: Hugging Face API token with "Inference Providers" permission
VITE_HF_TOKEN=hf_your_token_here

# Optional: Specify model (default: black-forest-labs/FLUX.1-schnell)
VITE_HF_MODEL=black-forest-labs/FLUX.1-schnell

# Optional: Force mock mode (default: auto-detect based on token)
VITE_USE_MOCK=false
```

### Getting a Hugging Face Token

1. Visit [Hugging Face Settings](https://huggingface.co/settings/tokens)
2. Create a new token with **"Inference Providers"** permission
3. Copy the token to your `.env` file

### Running the Application

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

Visit `http://localhost:5173` to start generating images!

## 📖 Usage Guide

### Creating Your First Image

1. **Enter a Prompt**: Describe the image you want in the text area
   ```
   A serene mountain lake at golden hour, cinematic lighting, highly detailed
   ```

2. **Adjust Settings**: Set inference steps (higher = more detail, slower generation)

3. **Generate**: Click "Generate" and watch the status progress through the pipeline

4. **View Results**: Your image appears in the gallery with a unique number (#1, #2, etc.)

### Tweaking Images

1. **Select Source**: Click "Tweak" on any completed generation
2. **Modify Prompt**: The form pre-fills with the original prompt - edit as desired
3. **Generate Variation**: Click "Generate" to create a linked variation
4. **Track Lineage**: New images show "↻ tweaked from #X" to maintain relationships

### Canvas Editing

1. **Open Editor**: Click "Canvas" on any completed generation
2. **Choose Tool**:
   - **Adjust**: Fine-tune brightness (50-150%), contrast (50-150%), saturation (0-200%)
   - **Crop**: Drag the overlay to reposition, drag corners to resize
   - **Text**: Enable overlay, enter text, adjust position/size/color
3. **Save Changes**: Click "Save to gallery" to persist edits
4. **Export**: Use "Download" for high-quality PNG files

### Managing Storage

The app automatically manages localStorage limits:
- Compresses preview images to JPEG format
- Removes old preview data when quota is exceeded
- Keeps the 50 most recent generations
- Maintains original images for restoration

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React 18.3.1 with hooks-based state management
- **Build Tool**: Vite 6.0.3 with HMR and dev proxy
- **Canvas**: HTML5 Canvas 2D API for image manipulation
- **Storage**: localStorage with IndexedDB migration fallback
- **API**: Hugging Face Inference API via proxy

### Project Structure

```
src/
├── components/           # React components
│   ├── Canvas.jsx       # Image editor with filters/crop/text
│   ├── CropOverlay.jsx  # Interactive crop selection UI
│   ├── Gallery.jsx      # Image grid with status badges
│   ├── GenerationCard.jsx # Individual gallery item
│   └── PromptForm.jsx   # Input form with settings
├── models/              # Data structures and business logic
│   └── generation.js    # Generation record schema and helpers
├── services/            # External API integration
│   ├── api/
│   │   ├── index.js     # API layer switcher (mock vs real)
│   │   ├── mockApi.js   # Development placeholder service
│   │   └── realApi.js   # Hugging Face integration
│   └── hfService.js     # HF Inference API client
├── utils/               # Shared utilities
│   ├── errors.js        # Error message mapping
│   ├── persistence.js   # localStorage management
│   └── proxyUrl.js      # API endpoint construction
├── App.jsx              # Root component and state orchestration
├── main.jsx             # React app entry point
└── index.css            # Global styles
```

### Data Model

Each generation is stored as:

```javascript
{
  id: "uuid",                    // Unique identifier
  displayIndex: 1,               // Human-readable #1, #2, etc.
  status: "done",                // queued|generating|done|failed
  prompt: "mountain lake...",    // User input text
  settings: { steps: 25 },       // Generation parameters
  imageUrl: "data:image/...",    // Generated image (data URL)
  sourceImageUrl: "data:...",    // Original before canvas edits
  parentId: "parent-uuid",       // For tweak lineage
  parentDisplayIndex: 3,         // "↻ tweaked from #3"
  provider: "huggingface",       // API provider
  model: "FLUX.1-schnell",       // Model identifier
  createdAt: 1640995200000,      // Timestamp
  updatedAt: 1640995200000,      // Last modified
  canvasTweak: {                 // Optional canvas edits
    filters: { brightness: 110, contrast: 95, saturate: 120 },
    crop: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 },
    textOverlay: { 
      text: "Hello", x: 50, y: 20, 
      fontSize: 32, color: "#ffffff", enabled: true 
    },
    previewDataUrl: "data:image/jpeg..."  // Compressed preview
  }
}
```

### API Integration

The app supports two modes:

**Mock Mode** (Development):
- Deterministic placeholder images from picsum.photos
- Simulated latency (1.8-4.2 seconds)
- No API costs or rate limits
- Automatic fallback when no token is provided

**Live Mode** (Production):
- Real Hugging Face Inference API calls
- Vite dev proxy handles token injection securely
- Support for multiple diffusion models
- Proper error handling for rate limits and model loading

## 🔧 Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_HF_TOKEN` | Yes* | - | HF API token with Inference Providers permission |
| `VITE_HF_MODEL` | No | `black-forest-labs/FLUX.1-schnell` | Diffusion model identifier |
| `VITE_USE_MOCK` | No | Auto-detect | Force mock mode (`true`/`false`) |

*Required for live image generation. App falls back to mock mode without token.

### Supported Models

- `black-forest-labs/FLUX.1-schnell` (default, fast)
- `black-forest-labs/FLUX.1-dev` (higher quality, slower)
- `stabilityai/stable-diffusion-xl-base-1.0`
- Any Hugging Face model with text-to-image inference support

### Vite Proxy Configuration

Development requests to `/api/hf/*` are proxied to `https://router.huggingface.co/hf-inference/*` with automatic token injection:

```javascript
// vite.config.js
server: {
  proxy: {
    '/api/hf': {
      target: 'https://router.huggingface.co',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api\/hf/, '/hf-inference'),
      configure: (proxy) => {
        proxy.on('proxyReq', (proxyReq) => {
          proxyReq.setHeader('Authorization', `Bearer ${hfToken}`);
          proxyReq.setHeader('x-wait-for-model', 'true');
        });
      },
    },
  },
}
```

## 🚨 Troubleshooting

### Common Issues

**"VITE_HF_TOKEN is not set" Error**
- Ensure your `.env` file contains a valid Hugging Face token
- Restart the dev server after adding the token
- Verify the token has "Inference Providers" permission

**"Model is loading" (503 Error)**
- Hugging Face models need warm-up time when cold
- Wait 30-60 seconds and retry
- The `x-wait-for-model` header helps but doesn't eliminate cold starts

**"Rate limit reached" (429 Error)**
- Free tier: 30,000 tokens/hour limit
- Upgrade to Pro for higher limits
- Wait for the rate limit window to reset

**"QuotaExceededError" in Console**
- localStorage is full (5MB limit)
- App automatically cleans old preview data
- Consider clearing browser storage if issues persist

**Images Not Loading**
- Check browser console for CORS errors
- Ensure stable internet connection
- Try refreshing the page to reload from localStorage

### Performance Tips

- Use fewer inference steps (15-20) for faster generation
- Enable mock mode during UI development
- Clear old generations periodically to free storage
- Use smaller crop areas to reduce canvas memory usage

## 🛠️ Development

### Adding New Features

**New Canvas Tools**:
1. Add tool to `TABS` array in `Canvas.jsx`
2. Implement tool UI in the tab conditional
3. Update `drawCanvas()` to apply the effect
4. Extend `CanvasTweak` type in `generation.js`

**New API Providers**:
1. Create new service file in `src/services/api/`
2. Implement `generateImage(prompt, settings)` function
3. Update `src/services/api/index.js` to include new provider
4. Add provider-specific environment variables

**Storage Backends**:
1. Extend `src/utils/persistence.js` with new backend
2. Implement same interface: `loadGenerations`, `saveGeneration`, etc.
3. Add migration logic for existing localStorage data

### Testing

```bash
# Run with mock API for consistent testing
VITE_USE_MOCK=true npm run dev

# Test error scenarios
# In browser console:
localStorage.setItem('gencanvas:test', JSON.stringify({
  settings: { simulateError: 'rate_limit' }
}));
```

### Building for Production

```bash
# Create optimized build
npm run build

# Test production build locally
npm run preview

# Deploy dist/ folder to your hosting provider
```

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## 🔗 Links

- [Hugging Face Inference API](https://huggingface.co/docs/api-inference/index)
- [FLUX.1 Model Documentation](https://huggingface.co/black-forest-labs/FLUX.1-schnell)
- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
