"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-popover/95 group-[.toaster]:text-popover-foreground group-[.toaster]:border-border group-[.toaster]:rounded-xl group-[.toaster]:shadow-2xl group-[.toaster]:backdrop-blur-md",
          title: "font-semibold tracking-tight",
          description: "group-[.toast]:text-muted-foreground",
          success:
            "group-[.toast]:border-accent-green/40 group-[.toast]:bg-accent-green/10",
          error:
            "group-[.toast]:border-accent-red/45 group-[.toast]:bg-accent-red/10",
          warning:
            "group-[.toast]:border-accent-amber/45 group-[.toast]:bg-accent-amber/10",
          info:
            "group-[.toast]:border-accent-blue/45 group-[.toast]:bg-accent-blue/10",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:font-medium",
          cancelButton:
            "group-[.toast]:bg-secondary group-[.toast]:text-secondary-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
