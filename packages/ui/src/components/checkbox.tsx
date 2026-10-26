import * as React from "react";
import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";

import { cn } from "../lib/cn";

export interface CheckboxProps extends Omit<
  React.ComponentProps<typeof BaseCheckbox.Root>,
  "children"
> {
  /** The visible text beside the box. Use `aria-label` instead for a label-less checkbox. */
  label?: React.ReactNode;
}

/** A checkbox with a visible checked indicator, labeled by the text beside it. */
export const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  ({ className, label, id, ...props }, ref) => {
    const generatedId = React.useId();
    const checkboxId = id ?? generatedId;
    const box = (
      <BaseCheckbox.Root
        ref={ref}
        id={checkboxId}
        className={cn(
          "peer flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-border-strong bg-surface",
          // Centered on the first line of a label that wraps (text-sm's line is 1.25rem).
          label && "mt-0.5",
          "data-[checked]:border-accent data-[checked]:bg-accent",
          "data-[disabled]:opacity-50",
          className,
        )}
        {...props}
      >
        <BaseCheckbox.Indicator className="flex text-accent-fg">
          <CheckIcon />
        </BaseCheckbox.Indicator>
      </BaseCheckbox.Root>
    );

    if (!label) return box;

    return (
      <div className="flex items-start gap-2">
        {box}
        <label htmlFor={checkboxId} className="text-sm text-text select-none">
          {label}
        </label>
      </div>
    );
  },
);
Checkbox.displayName = "Checkbox";

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 10 10"
      className="h-2.5 w-2.5"
      fill="none"
    >
      <path
        d="M1.5 5.5L4 8l4.5-6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
