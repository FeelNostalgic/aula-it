import * as React from "react";
import { cn } from "@/utils/cn";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Card = ({ children, className, ...props }: CardProps) => {
  return (
    <div
      className={cn(
        "industrial-card w-full",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className, ...props }: CardProps) => {
  return (
    <div className={cn("mb-6 space-y-1.5", className)} {...props}>
      {children}
    </div>
  );
};

export const CardTitle = ({ children, className, ...props }: CardProps) => {
  return (
    <h3 className={cn("text-lg font-sans font-semibold tracking-tight text-text-primary", className)} {...props}>
      {children}
    </h3>
  );
};

export const CardDescription = ({ children, className, ...props }: CardProps) => {
  return (
    <p className={cn("text-xs font-mono text-text-muted", className)} {...props}>
      {children}
    </p>
  );
};

export const CardContent = ({ children, className, ...props }: CardProps) => {
  return (
    <div className={cn("space-y-4", className)} {...props}>
      {children}
    </div>
  );
};

export const CardFooter = ({ children, className, ...props }: CardProps) => {
  return (
    <div className={cn("mt-6 flex items-center pt-6 border-t border-border-subtle", className)} {...props}>
      {children}
    </div>
  );
};
