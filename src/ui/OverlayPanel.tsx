import type { MapOverlay } from '../domain/types'

type Props = {
  overlays: MapOverlay[]
  aligningId: string | null
  onUpload: (file: File) => void
  onToggle: (id: string) => void
  onAlign: (id: string | null) => void
  onOpacity: (id: string, opacity: number) => void
  onDelete: (id: string) => void
}

export function OverlayPanel({
  overlays,
  aligningId,
  onUpload,
  onToggle,
  onAlign,
  onOpacity,
  onDelete,
}: Props) {
  return (
    <section className="overlay-panel">
      <h3>Old maps</h3>
      <p className="hint">Available anytime. Drag the three corners to enlarge or twist.</p>
      <label className="upload">
        Upload JPG/PNG
        <input
          type="file"
          accept="image/jpeg,image/png"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) onUpload(file)
            event.target.value = ''
          }}
        />
      </label>
      <ul>
        {overlays.map((overlay) => (
          <li key={overlay.id}>
            <label className="check">
              <input type="checkbox" checked={overlay.visible} onChange={() => onToggle(overlay.id)} />
              {overlay.title}
            </label>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={overlay.opacity}
              onChange={(event) => onOpacity(overlay.id, Number(event.target.value))}
            />
            <div className="row">
              <button type="button" onClick={() => onAlign(aligningId === overlay.id ? null : overlay.id)}>
                {aligningId === overlay.id ? 'Done aligning' : 'Align'}
              </button>
              <button type="button" onClick={() => onDelete(overlay.id)}>
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
