import * as React from "react";

import { cn } from "../lib/cn";

const sizeClass = {
  sm: "text-lg font-semibold tracking-tight",
  md: "text-xl font-semibold tracking-tight",
  lg: "text-2xl font-semibold tracking-tight",
  xl: "text-3xl font-semibold tracking-tight",
} as const;

export interface HeadingProps extends React.ComponentProps<"h1"> {
  /** Which heading element to render: keep this matched to the document outline. */
  level?: 1 | 2 | 3 | 4;
  /** The visual size; independent of `level` so outline and appearance can differ. */
  size?: keyof typeof sizeClass;
}

/** A page or section heading. Pick `level` for the outline, `size` for how big it looks. */
export const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ className, level = 1, size, ...props }, ref) => {
    const Component = `h${level}` as "h1" | "h2" | "h3" | "h4";
    const resolvedSize =
      size ?? (level === 1 ? "xl" : level === 2 ? "lg" : "md");
    return (
      <Component
        ref={ref}
        className={cn(sizeClass[resolvedSize], "text-text", className)}
        {...props}
      />
    );
  },
);
Heading.displayName = "Heading";
