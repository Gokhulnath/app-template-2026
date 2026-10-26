import * as React from "react";
import { type VariantProps, cva } from "class-variance-authority";

import { cn } from "../lib/cn";

export const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      tone: {
        neutral: "bg-surface-muted text-text",
        accent: "bg-accent-subtle text-accent",
        success: "bg-success-subtle text-success",
        warning: "bg-warning-subtle text-warning",
        danger: "bg-danger-subtle text-danger",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  },
);

const dotVariants = cva("h-1.5 w-1.5 shrink-0 rounded-full", {
  variants: {
    tone: {
      neutral: "bg-text-muted",
      accent: "bg-accent",
      success: "bg-success",
      warning: "bg-warning",
      danger: "bg-danger",
    },
  },
  defaultVariants: {
    tone: "neutral",
  },
});

export interface BadgeProps
  extends React.ComponentProps<"span">, VariantProps<typeof badgeVariants> {
  /** Shows a small colored dot before the label, e.g. for a live/connection state. */
  dot?: boolean;
}

/** A small status label, e.g. a live connection indicator. */
export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, tone, dot, children, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(badgeVariants({ tone }), className)}
      {...props}
    >
      {dot && <span aria-hidden="true" className={dotVariants({ tone })} />}
      {children}
    </span>
  ),
);
Badge.displayName = "Badge";
