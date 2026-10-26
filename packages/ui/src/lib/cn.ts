import { tokens } from "@myapp/tokens";
import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// theme.css (packages/tokens) clears Tailwind's built-in color, font, size, radius and
// shadow scales and replaces them with the design system's own names. Plain tailwind-merge
// only knows Tailwind's defaults, so it wouldn't see `bg-surface` and `bg-surface-muted`, or
// `text-sm` and `text-text`, as rival classes and would keep both. The names come from the
// tokens themselves, so a new token needs no change here.
const colors = Object.keys(tokens.color.light);
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: Object.keys(tokens.font.size) }],
      "font-weight": [{ font: Object.keys(tokens.font.weight) }],
      "bg-color": [{ bg: colors }],
      "text-color": [{ text: colors }],
      "border-color": [{ border: colors }],
      rounded: [{ rounded: Object.keys(tokens.radius) }],
      shadow: [{ shadow: Object.keys(tokens.shadow) }],
    },
  },
});

/** Merges class names, resolving conflicts between the design system's own token utilities. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
