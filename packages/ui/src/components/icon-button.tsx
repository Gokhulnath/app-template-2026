import * as React from "react";
import { Button as BaseButton } from "@base-ui/react/button";
import { type VariantProps, cva } from "class-variance-authority";

import { cn } from "../lib/cn";

export const iconButtonVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-full transition-colors data-disabled:pointer-events-none data-disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-fg hover:bg-accent-hover",
        secondary:
          "bg-surface-muted text-text hover:bg-border border border-border",
        ghost: "text-text-muted hover:bg-surface-muted hover:text-text",
        danger: "bg-danger text-accent-fg hover:opacity-90",
      },
      size: {
        sm: "h-8 w-8",
        md: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "ghost",
      size: "md",
    },
  },
);

export interface IconButtonProps
  extends
    Omit<React.ComponentProps<typeof BaseButton>, "render">,
    VariantProps<typeof iconButtonVariants> {
  /** Required: an icon-only button has no visible label, so it needs an accessible name. */
  "aria-label": string;
}

/** A square, icon-only button. Always pass `aria-label`; there's no visible text otherwise. */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <BaseButton
        ref={ref}
        className={cn(iconButtonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
IconButton.displayName = "IconButton";
