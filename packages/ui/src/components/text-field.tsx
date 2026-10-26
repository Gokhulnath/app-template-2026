import * as React from "react";
import { Field } from "@base-ui/react/field";
import { Input as BaseInput } from "@base-ui/react/input";

import { cn } from "../lib/cn";

export interface TextFieldProps extends Omit<
  React.ComponentProps<typeof BaseInput>,
  "className"
> {
  label: string;
  /** Helper text shown under the input when there's no error. */
  description?: string;
  /** When set, replaces the description with an error message and marks the field invalid. */
  error?: string;
  className?: string;
  inputClassName?: string;
}

/**
 * A labeled text input, built on Base UI's Field so the label, description and error are
 * all associated with the input for screen readers.
 */
export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(
  (
    {
      label,
      description,
      error,
      className,
      inputClassName,
      id,
      disabled,
      ...props
    },
    ref,
  ) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    return (
      <Field.Root
        disabled={disabled}
        invalid={Boolean(error)}
        className={cn("flex flex-col gap-1.5", className)}
      >
        <Field.Label
          htmlFor={inputId}
          className="text-sm font-medium text-text"
        >
          {label}
        </Field.Label>
        <BaseInput
          ref={ref}
          id={inputId}
          className={cn(
            "h-10 rounded-lg border bg-surface px-3 text-sm text-text placeholder:text-text-muted disabled:cursor-not-allowed disabled:opacity-50",
            error ? "border-danger" : "border-border-strong",
            inputClassName,
          )}
          {...props}
        />
        {error ? (
          <Field.Error match className="text-sm text-danger">
            {error}
          </Field.Error>
        ) : description ? (
          <Field.Description className="text-sm text-text-muted">
            {description}
          </Field.Description>
        ) : null}
      </Field.Root>
    );
  },
);
TextField.displayName = "TextField";
