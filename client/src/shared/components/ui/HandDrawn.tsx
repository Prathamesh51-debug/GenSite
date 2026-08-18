import type { CSSProperties } from 'react';

/**
 * Hand-drawn SVG primitives — the warm, made-by-hand accents used across the app.
 * All strokes use `currentColor` so they inherit the surrounding text colour and
 * adapt to light/dark automatically. Place inside a `relative` parent.
 */

type UnderlineProps = {
  className?: string;
  /** stroke colour utility (defaults to clay via text-* on the svg) */
  style?: CSSProperties;
};

/** A wavy sketch underline. Sits under a word — parent should be `relative inline-block`. */
export function SketchUnderline({ className, style }: UnderlineProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 200 13"
      preserveAspectRatio="none"
      className={className}
      style={{ position: 'absolute', left: 0, right: 0, bottom: '-0.28em', width: '100%', height: '0.42em', overflow: 'visible', ...style }}
    >
      <path
        d="M2 8 C40 2, 70 12, 100 7 S160 2, 198 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** A short doodle sparkle — a hand-drawn asterisk/star for playful punctuation. */
export function Sparkle({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none">
      <path d="M12 2 C12.6 7, 17 11.4, 22 12 C17 12.6, 12.6 17, 12 22 C11.4 17, 7 12.6, 2 12 C7 11.4, 11.4 7, 12 2 Z"
        fill="currentColor" />
    </svg>
  );
}

/** A hand-drawn tick, revealed by adding `data-on` on an ancestor if desired. */
export function SketchTick({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none">
      <path d="M4 13 C7 15, 9 18, 10 20 C13 13, 17 7, 21 4"
        fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"
        vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
