function StrokeIcon({
  d,
  viewBox = '0 0 24 24',
  width = 18,
  height = 18,
}: {
  d: string
  viewBox?: string
  width?: number
  height?: number
}) {
  return (
    <svg viewBox={viewBox} width={width} height={height} aria-hidden="true" focusable="false">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        d={d}
      />
    </svg>
  )
}

const PANEL_NAV = { viewBox: '4.2 5.2 15.6 13.6', width: 20, height: 18 }

export function BackIcon() {
  return <StrokeIcon {...PANEL_NAV} d="M19 12H5M11 6l-6 6 6 6" />
}

export function CloseIcon() {
  return <StrokeIcon d="M6 6l12 12M18 6L6 18" />
}

/** Same frame and left edge as BackIcon so a panel's close and back align with the content below. */
export function PanelCloseIcon() {
  return <StrokeIcon {...PANEL_NAV} d="M5 6l12 12M17 6L5 18" />
}

export function ChevronLeftIcon() {
  return <StrokeIcon d="M15 6l-6 6 6 6" />
}

export function ChevronRightIcon() {
  return <StrokeIcon d="M9 6l6 6-6 6" />
}

export function PlusIcon() {
  return <StrokeIcon d="M12 5v14M5 12h14" />
}

export function MinusIcon() {
  return <StrokeIcon d="M5 12h14" />
}