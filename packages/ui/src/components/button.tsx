import * as React from "react";
import { Button as BaseButton } from "@base-ui/react/button";
import { type VariantProps, cva } from "class-variance-authority";

import { cn } from "../lib/cn";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-colors data-disabled:pointer-events-none data-disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-fg hover:bg-accent-hover",
        secondary:
          "bg-surface-muted text-text hover:bg-border border border-border",
        ghost: "text-text hover:bg-surface-muted",
        danger: "bg-danger text-accent-fg hover:opacity-90",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-sm",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends
    Omit<React.ComponentProps<typeof BaseButton>, "render">,
    VariantProps<typeof buttonVariants> {
  /** Shows a spinner in place of the label and prevents interaction. */
  loading?: boolean;
}

/** The single button component every client uses: primary/secondary/ghost/danger, two sizes. */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, loading, disabled, children, ...props },
    ref,
  ) => {
    return (
      <BaseButton
        ref={ref}
        disabled={disabled || loading}
        // A button that starts loading after a click keeps keyboard focus.
        focusableWhenDisabled={loading}
        aria-busy={loading || undefined}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {loading ? (
          <>
            <Spinner />
            <span className="sr-only">Loading</span>
            <span aria-hidden="true">{children}</span>
          </>
        ) : (
          children
        )}
      </BaseButton>
    );
  },
);
Button.displayName = "Button";

function Spinner() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-4 w-4 animate-spin motion-reduce:animate-none"
      fill="none"
    >
      <circle
        cx="8"
        cy="8"
        r="6.5"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="2.5"
      />
      <path
        d="M14.5 8a6.5 6.5 0 0 0-6.5-6.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
