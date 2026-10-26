import * as React from "react";

import { cn } from "../lib/cn";

const gapClass: Record<number, string> = {
  1: "gap-1",
  2: "gap-2",
  3: "gap-3",
  4: "gap-4",
  5: "gap-5",
  6: "gap-6",
  8: "gap-8",
  10: "gap-10",
  12: "gap-12",
  16: "gap-16",
};

const alignClass = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
} as const;

const justifyClass = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
} as const;

export interface StackProps extends React.HTMLAttributes<HTMLElement> {
  /** The element to render; defaults to `div`. */
  as?: "div" | "span" | "main" | "section" | "ul" | "li" | "header" | "footer";
  direction?: "row" | "column";
  /** A step from the tokens' spacing scale (1, 2, 3, 4, 5, 6, 8, 10, 12, 16). */
  gap?: keyof typeof gapClass;
  align?: keyof typeof alignClass;
  justify?: keyof typeof justifyClass;
  wrap?: boolean;
}

/** The one layout primitive: every gap between elements comes from here, not raw flex classes. */
export const Stack = React.forwardRef<HTMLDivElement, StackProps>(
  (
    {
      className,
      as: Component = "div",
      direction = "column",
      gap = 4,
      align,
      justify,
      wrap,
      ...props
    },
    ref,
  ) =>
    React.createElement(Component, {
      ref,
      className: cn(
        "flex",
        direction === "row" ? "flex-row" : "flex-col",
        gapClass[gap],
        align && alignClass[align],
        justify && justifyClass[justify],
        wrap && "flex-wrap",
        className,
      ),
      ...props,
    }),
);
Stack.displayName = "Stack";
