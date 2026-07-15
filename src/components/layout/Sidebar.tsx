"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/permissions/roles";

type SidebarProps = {
  title: string;
  navItems: NavItem[];
};

function isNavActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ title, navItems }: SidebarProps) {
  const pathname = usePathname();
  const visibleItems = navItems.filter((item) => !item.hidden);

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border-default bg-surface-card">
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

      <nav aria-label="Portal navigation" className="flex-1 space-y-1 p-3">
        {visibleItems.map((item) => {
          const active = isNavActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-card",
                active
                  ? "border-l-4 border-brand-primary bg-brand-primary-soft font-medium text-brand-primary"
                  : "border-l-4 border-transparent text-text-muted hover:bg-surface-muted hover:text-text-primary"
              )}
            >
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.badge ? (
                <span className="shrink-0 rounded-md bg-surface-muted px-1.5 py-0.5 text-[10px] font-medium leading-none text-text-muted">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
