import * as React from "react";
import { cn } from "@/utils/cn";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="text-xs font-mono text-text-muted uppercase tracking-wider">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            "industrial-input w-full font-mono",
            error && "border-accent-red focus:border-accent-red",
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-[10px] font-mono text-accent-red uppercase tracking-tight">
            {error}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";
