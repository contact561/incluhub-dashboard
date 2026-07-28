"use client";

import Image from "next/image";
import { PortalNavList } from "@/components/layout/PortalNavList";
import type { NavItem } from "@/lib/permissions/roles";

type SidebarProps = {
  title: string;
  navItems: NavItem[];
};

export function Sidebar({ title, navItems }: SidebarProps) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-t-2 border-border-default border-t-brand-gold bg-surface-card md:flex">
      <div className="border-b border-border-default px-4 py-4">
        <div className="flex items-center gap-3">
          <Image
            src="/brand/incluhub-logo.svg"
            alt="IncluHub"
            width={36}
            height={36}
            className="h-9 w-9 shrink-0 object-contain"
            priority
            unoptimized
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text-primary">
              IncluHub
            </p>
            <p className="mt-0.5 truncate text-xs text-text-muted">{title}</p>
          </div>
        </div>
      </div>

      <PortalNavList navItems={navItems} />
    </aside>
  );
}
