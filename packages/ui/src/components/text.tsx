import * as React from "react";
import { type VariantProps, cva } from "class-variance-authority";

import { cn } from "../lib/cn";

export const textVariants = cva("", {
  variants: {
    variant: {
      body: "text-base text-text",
      muted: "text-sm text-text-muted",
      small: "text-sm text-text",
    },
  },
  defaultVariants: {
    variant: "body",
  },
});

export interface TextProps
  extends React.ComponentProps<"p">, VariantProps<typeof textVariants> {
  /** The element to render; defaults to `p`. */
  as?: "p" | "span" | "div";
}

/** Body copy. `variant="muted"` is the design system's one secondary-text color. */
export const Text = React.forwardRef<HTMLParagraphElement, TextProps>(
  ({ className, variant, as: Component = "p", ...props }, ref) => (
    <Component
      ref={ref as React.Ref<never>}
      className={cn(textVariants({ variant }), className)}
      {...props}
    />
  ),
);
Text.displayName = "Text";
