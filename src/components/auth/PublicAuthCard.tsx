import Image from "next/image";
import type { ReactNode } from "react";

type PublicAuthCardProps = {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function PublicAuthCard({
  title,
  description,
  children,
  footer,
}: PublicAuthCardProps) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface-page px-4 py-10">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-brand-primary-soft to-transparent"
        aria-hidden="true"
      />

      <section className="relative w-full max-w-sm rounded-card border border-border-default border-t-[3px] border-t-brand-gold bg-surface-card p-6 shadow-md sm:p-8">
        <header className="mb-6 text-center">
          <Image
            src="/brand/incluhub-logo.svg"
            alt="IncluHub"
            width={64}
            height={64}
            className="mx-auto h-16 w-16 object-contain"
            priority
            unoptimized
          />
          <p className="mt-3 text-label font-semibold tracking-[0.16em] text-brand-gold-strong">
            IncluHub
          </p>
          <h1 className="mt-1 text-page-title text-text-primary">{title}</h1>
          <p className="mt-2 text-body text-text-muted">{description}</p>
        </header>

        {children}

        {footer ? (
          <footer className="mt-6 border-t border-border-default pt-5 text-center text-sm text-text-muted">
            {footer}
          </footer>
        ) : null}
      </section>
    </main>
  );
}
