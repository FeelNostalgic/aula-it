"use client";

import { usePathname } from "next/navigation";
import NextLink from "next/link";
import { UserCog, Users, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    label: "Profesores",
    href: "/admin/teachers",
    icon: UserCog,
  },
  {
    label: "Alumnos",
    href: "/admin/students",
    icon: Users,
  },
  {
    label: "Matriculación",
    href: "/admin/enrollment",
    icon: BookOpen,
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-52 shrink-0 border-r border-border/50 bg-background flex flex-col">
      <nav className="flex flex-col gap-1 p-3 pt-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <NextLink
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-mono transition-colors",
                isActive
                  ? "bg-primary/10 text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/10"
              )}
            >
              <Icon className={cn("size-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
              {item.label}
            </NextLink>
          );
        })}
      </nav>
    </aside>
  );
}
