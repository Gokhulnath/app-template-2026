import * as React from "react";
import { type VariantProps, cva } from "class-variance-authority";

import { cn } from "../lib/cn";

export const alertVariants = cva(
  "flex items-start gap-3 rounded-lg border px-4 py-3 text-sm",
  {
    variants: {
      tone: {
        info: "border-border bg-accent-subtle text-accent",
        success: "border-border bg-success-subtle text-success",
        warning: "border-border bg-warning-subtle text-warning",
        danger: "border-border bg-danger-subtle text-danger",
      },
    },
    defaultVariants: {
      tone: "info",
    },
  },
);

export interface AlertProps
  extends
    Omit<React.ComponentProps<"div">, "title">,
    VariantProps<typeof alertVariants> {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** A button (typically a ghost/secondary Button) rendered at the end of the alert. */
  action?: React.ReactNode;
}

/** An inline banner for a page- or section-level message, with an optional action. */
export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, tone, title, description, action, ...props }, ref) => (
    <div
      ref={ref}
      role={tone === "danger" || tone === "warning" ? "alert" : "status"}
      className={cn(alertVariants({ tone }), className)}
      {...props}
    >
      <div className="flex flex-1 flex-col gap-0.5">
        <p className="font-medium">{title}</p>
        {description && <p className="text-text">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  ),
);
Alert.displayName = "Alert";
