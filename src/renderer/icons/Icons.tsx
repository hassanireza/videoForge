import React from "react";

export interface IconProps {
  size?: number;
  className?: string;
}

const base = (size = 18) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

/**
 * Brand mark for VideoForge, drawn from the same visual language as the
 * portfolio brand it now shares an identity with: hairline strokes only
 * (no fills, no rounded soft shapes, no gradients), a thin concentric ring
 * echoing the brand's halo motif, and a viewfinder/aperture bracket standing
 * in for "video" — the corners of a camera frame rather than a play button.
 */
export function Logo({ size = 30, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="14.5" stroke="var(--border-hover)" strokeWidth="1" fill="none" />
      <circle cx="16" cy="16" r="10.5" stroke="var(--accent)" strokeWidth="1" fill="none" opacity="0.6" />
      {/* viewfinder corner brackets */}
      <path d="M10 8H8v2" stroke="var(--accent-bright)" strokeWidth="1.3" fill="none" />
      <path d="M22 8h2v2" stroke="var(--accent-bright)" strokeWidth="1.3" fill="none" />
      <path d="M10 24H8v-2" stroke="var(--accent-bright)" strokeWidth="1.3" fill="none" />
      <path d="M22 24h2v-2" stroke="var(--accent-bright)" strokeWidth="1.3" fill="none" />
      {/* single aperture blade, off-center — the one asymmetry in an otherwise centered mark */}
      <path d="M14.5 12.5L20 16L14.5 19.5V12.5Z" fill="var(--accent-bright)" />
    </svg>
  );
}

export function IconConvert({ size, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4 7h13l-3-3M20 17H7l3 3" />
    </svg>
  );
}

export function IconSpeed({ size, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4 15a8 8 0 1 1 16 0" />
      <path d="M12 15l4-5" />
      <circle cx="12" cy="15" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconCrop({ size, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M7 3v14a1 1 0 0 0 1 1h14" />
      <path d="M17 21V7a1 1 0 0 0-1-1H3" />
    </svg>
  );
}

export function IconMusicAdd({ size, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M10 18V6l10-2v12" />
      <circle cx="7" cy="18" r="3" />
      <circle cx="17" cy="16" r="3" />
    </svg>
  );
}

export function IconMute({ size, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4 9v6h4l5 5V4L8 9H4Z" />
      <path d="M17 8l5 8M22 8l-5 8" />
    </svg>
  );
}

export function IconWaveform({ size, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M3 12v0M7 8v8M11 4v16M15 8v8M19 10v4M21 12v0" />
    </svg>
  );
}

export function IconPlus({ size, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconPlay({ size, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} strokeWidth={1.4}>
      <path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconClose({ size, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function IconCheck({ size, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function IconAlert({ size, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12 9v4" />
      <path d="M12 16.5v.01" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

export function IconFolder({ size, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
    </svg>
  );
}
