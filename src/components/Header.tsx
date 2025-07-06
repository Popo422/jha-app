"use client";

import { Menu } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { toggleSidebar } from "@/lib/features/sidebar/sidebarSlice";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function Header() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { contractor } = useAppSelector((state) => state.auth);

  return (
    <header className="bg-[#242736] dark:bg-background shadow-sm border-b border-border">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-4">
          <div
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => {
              router.push("/announcements");
            }}
          >
            <img 
              src={contractor?.companyLogoUrl || "/logo.png"} 
              alt={contractor?.name || "JHA App"} 
              width={140} 
              height={30}
            />
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => dispatch(toggleSidebar())}
            aria-label="Toggle sidebar"
            className="text-white dark:text-foreground hover:bg-white/10 dark:hover:bg-muted p-3"
          >
            <Menu size={32} />
          </Button>
        </div>
      </div>
    </header>
  );
}
