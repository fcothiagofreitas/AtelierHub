"use client";

import * as React from "react";
import { CheckIcon, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const preference = (theme ?? "system") as "light" | "dark" | "system";

  const TriggerIcon =
    preference === "dark"
      ? Moon
      : preference === "light"
        ? Sun
        : Monitor;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "size-8"
        )}
        aria-label="Tema da interface"
      >
        <TriggerIcon className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="size-4" />
          Claro
          {mounted && preference === "light" ? (
            <CheckIcon className="ml-auto size-4 text-muted-foreground" />
          ) : null}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="size-4" />
          Escuro
          {mounted && preference === "dark" ? (
            <CheckIcon className="ml-auto size-4 text-muted-foreground" />
          ) : null}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Monitor className="size-4" />
          Sistema
          {mounted && preference === "system" ? (
            <CheckIcon className="ml-auto size-4 text-muted-foreground" />
          ) : null}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
