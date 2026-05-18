# GenCanvas data model

Persisted in **localStorage** under key `gencanvas:v1`.

## Root document

```json
{
  "version": 1,
  "generations": [ /* Generation[] */ ]
}
```

## Generation

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | UUID primary key |
| `displayIndex` | number | Gallery label **#1**, **#2**… |
| `status` | enum | `queued` → `generating` → `done` \| `failed` |
| `prompt` | string | User text prompt |
| `settings` | object | `{ steps: number }` inference steps |
| `imageUrl` | string? | Data URL or HTTPS URL when `done` |
| `errorMessage` | string? | User-facing error when `failed` |
| `parentId` | string? | Source generation when created via **Tweak** |
| `parentDisplayIndex` | number? | Denormalized for badge: "↻ tweaked from #3" |
| `provider` | string | Always `huggingface` |
| `model` | string? | HF model id |
| `mocked` | boolean? | True if mock API was used |
| `createdAt` | number | Epoch ms |
| `updatedAt` | number | Epoch ms |
| `canvasTweak` | CanvasTweak? | Saved canvas edits |

## CanvasTweak

| Field | Type | Description |
|-------|------|-------------|
| `filters` | object? | `{ brightness, contrast, saturate }` (percent) |
| `crop` | object? | Normalized rect `{ x, y, width, height }` (0–1) |
| `textOverlay` | object? | `{ text, x, y, fontSize, color }` — x/y are % of stage |
| `previewDataUrl` | string? | Flattened PNG after save |

## Status lifecycle

```
[Generate] → queued → generating → done
                              └→ failed → (retry) → queued → …
```

## Lineage

When user clicks **Tweak** on #3 and generates again, the new record includes:

```json
{ "parentId": "<uuid-of-3>", "parentDisplayIndex": 3 }
```

Gallery renders: `↻ tweaked from #3`.
