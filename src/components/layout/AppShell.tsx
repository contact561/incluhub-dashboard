import type { ReactNode } from "react";

type AppShellProps = {
  sidebar: ReactNode;
  header: ReactNode;
  children: ReactNode;
};

/**
 * Desktop authenticated application shell (UI-1B1).
 * Mobile drawer navigation is deferred to UI-1B2.
 */
export function AppShell({ sidebar, header, children }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-surface-page">
      {sidebar}

      <div className="flex min-w-0 flex-1 flex-col">
        {header}
        {/*
          Content padding stays on main for shell consistency.
          Several role pages still add their own p-6 (duplicate padding) —
          defer cleanup to UI-2 / UI-3 / UI-4 page polish.
        */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
