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
 * Brand mark for VideoForge. A rounded-square tile (matches the app's own
 * card radius language) containing a play triangle cut by a single motion
 * chevron — reads as "video" + "speed/transform" at a glance, the two
 * concepts the app is actually built around. Flat, single accent fill,
 * no gradients.
 */
export function Logo({ size = 30, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="9" fill="var(--accent)" />
      <path d="M12.5 10.5L21 16L12.5 21.5V10.5Z" fill="#ffffff" />
      <path
        d="M7.5 16H10.5"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.55"
      />
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
