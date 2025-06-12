"use client";

import { Menu, Moon, Sun } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { toggleSidebar } from "@/lib/features/sidebar/sidebarSlice";
import { toggleTheme } from "@/lib/features/theme/themeSlice";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function Header() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => state.theme.mode);
  const router = useRouter();

  return (
    <header className="bg-[#242736] dark:bg-background shadow-sm border-b border-border">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => dispatch(toggleTheme())} aria-label="Toggle theme" className="text-white dark:text-foreground hover:bg-white/10 dark:hover:bg-muted">
            {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>
          <h1
            className="text-xl font-semibold text-white dark:text-foreground cursor-pointer"
            onClick={() => {
              router.push("/");
            }}
          >
            JHA App
          </h1>
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => dispatch(toggleSidebar())} aria-label="Toggle sidebar" className="text-white dark:text-foreground hover:bg-white/10 dark:hover:bg-muted">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
