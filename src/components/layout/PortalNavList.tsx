"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/permissions/roles";

export function isNavActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

type PortalNavListProps = {
  navItems: NavItem[];
  onNavigate?: () => void;
  /** Larger touch targets for mobile drawer (~44px). */
  touchFriendly?: boolean;
};

export function PortalNavList({
  navItems,
  onNavigate,
  touchFriendly = false,
}: PortalNavListProps) {
  const pathname = usePathname();
  const visibleItems = navItems.filter((item) => !item.hidden);

  return (
    <nav aria-label="Portal navigation" className="flex-1 space-y-1 p-3">
      {visibleItems.map((item) => {
        const active = isNavActive(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            onClick={() => onNavigate?.()}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 text-sm transition-colors",
              "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-card",
              touchFriendly ? "min-h-11 py-2.5" : "min-h-10 py-2",
              active
                ? "border-l-4 border-brand-gold bg-brand-gold-soft font-medium text-text-primary"
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
  );
}
