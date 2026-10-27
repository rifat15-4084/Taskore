"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { Sheet, SheetContent } from "@/components/ui/sheet";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <div className="hidden md:flex">
        <Sidebar />
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="p-0 w-72">
          <Sidebar onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="md:pl-72">
        <Topbar onMenuClick={() => setOpen(true)} />
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
