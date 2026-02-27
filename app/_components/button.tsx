import * as React from "react";
import { cn } from "@/utils/cn";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", size = "md", ...props }, ref) => {
    const variants = {
      primary: "bg-accent-blue text-white border-accent-blue hover:bg-accent-blue/90",
      secondary: "industrial-button",
      danger: "bg-accent-red/10 text-accent-red border-accent-red/20 hover:bg-accent-red/20",
      ghost: "border-transparent hover:bg-white/5",
    };

    const sizes = {
      sm: "px-2 py-1 text-xs",
      md: "px-4 py-2 text-sm",
      lg: "px-6 py-3 text-base",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-mono transition-colors disabled:opacity-50 disabled:cursor-not-allowed border",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
