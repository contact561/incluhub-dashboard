"use client";

import { useState } from "react";
import Image from "next/image";
import { MenuIcon, XIcon } from "lucide-react";
import { logoutAction } from "@/actions/auth/logout";
import { PortalNavList } from "@/components/layout/PortalNavList";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { NavItem } from "@/lib/permissions/roles";

type MobileNavigationProps = {
  title: string;
  navItems: NavItem[];
  userName: string;
};

/**
 * Mobile-only header + navigation drawer (UI-1B2).
 * Reuses the same NavItem metadata as the desktop Sidebar.
 */
export function MobileNavigation({
  title,
  navItems,
  userName,
}: MobileNavigationProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className="flex h-14 items-center gap-3 border-b-2 border-brand-gold bg-surface-card px-3 md:hidden">
      <Image
        src="/brand/incluhub-logo.svg"
        alt="IncluHub"
        width={32}
        height={32}
        className="h-8 w-8 shrink-0 object-contain"
        priority
        unoptimized
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-text-primary">
          IncluHub
        </p>
        <p className="truncate text-xs text-text-muted">{title}</p>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-11 shrink-0"
              aria-label="Open navigation menu"
            />
          }
        >
          <MenuIcon className="size-5" aria-hidden />
        </DialogTrigger>

        <DialogContent
          showCloseButton={false}
          className="fixed inset-y-0 left-0 top-0 z-50 flex h-dvh max-h-dvh w-[min(20rem,calc(100%-2.5rem))] max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none rounded-r-xl p-0 ring-1 ring-border-default data-closed:slide-out-to-left data-open:slide-in-from-left data-closed:zoom-out-100 data-open:zoom-in-100"
        >
          <DialogHeader className="shrink-0 border-b border-border-default px-4 py-4 pr-12 text-left">
            <div className="flex items-start gap-3">
              <Image
                src="/brand/incluhub-logo.svg"
                alt=""
                width={32}
                height={32}
                className="h-8 w-8 shrink-0 object-contain"
                unoptimized
              />
              <div className="min-w-0">
                <DialogTitle className="text-sm font-semibold text-text-primary">
                  Navigation
                </DialogTitle>
                <DialogDescription className="mt-0.5 text-xs text-text-muted">
                  {title} · Signed in as {userName}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <DialogClose
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-3 right-3 size-11"
                aria-label="Close navigation menu"
              />
            }
          >
            <XIcon className="size-5" aria-hidden />
          </DialogClose>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <PortalNavList
              navItems={navItems}
              touchFriendly
              onNavigate={() => setOpen(false)}
            />
          </div>

          <div className="shrink-0 border-t border-border-default p-3">
            <form action={logoutAction}>
              <Button type="submit" variant="outline" className="h-11 w-full">
                Sign out
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
