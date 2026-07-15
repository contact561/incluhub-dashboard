import type { ReactNode } from "react";

type AppShellProps = {
  sidebar: ReactNode;
  mobileHeader?: ReactNode;
  header: ReactNode;
  children: ReactNode;
};

/**
 * Authenticated application shell.
 * Desktop sidebar (md+) and mobile header/drawer (< md) via UI-1B2.
 */
export function AppShell({
  sidebar,
  mobileHeader,
  header,
  children,
}: AppShellProps) {
  return (
    <div className="flex min-h-screen min-w-0 overflow-x-hidden bg-surface-page">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[100] focus:rounded-lg focus:bg-surface-card focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-text-primary focus:ring-2 focus:ring-ring"
      >
        Skip to content
      </a>

      {sidebar}

      <div className="flex min-w-0 flex-1 flex-col">
        {mobileHeader}
        {header}
        {/*
          Shell content padding. Several role pages still add their own p-6
          (duplicate padding) — cleanup deferred to UI-2 / UI-3 / UI-4.
        */}
        <main id="main-content" tabIndex={-1} className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
