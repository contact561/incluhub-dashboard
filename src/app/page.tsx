import Image from "next/image";
import Link from "next/link";

export default function RootPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface-page px-4 py-10">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-brand-primary-soft to-transparent"
        aria-hidden="true"
      />
      <section className="relative w-full max-w-xl rounded-card border border-border-default bg-surface-card p-8 text-center shadow-md sm:p-12">
        <Image
          src="/brand/incluhub-logo.svg"
          alt="IncluHub"
          width={80}
          height={80}
          className="mx-auto h-20 w-20 object-contain"
          priority
          unoptimized
        />
        <p className="mt-4 text-label font-semibold tracking-wide text-brand-primary">
          IncluHub
        </p>
        <h1 className="mt-2 text-display text-text-primary">
          IncluHub Dashboard
        </h1>
        <p className="mx-auto mt-3 max-w-md text-body-lg text-text-muted">
          Program workflow dashboard for IncluHub post-academic support.
        </p>
        <Link
          href="/login"
          className="mt-8 inline-flex min-h-11 items-center justify-center rounded-control bg-brand-primary px-6 py-2.5 text-label text-brand-primary-foreground transition-colors hover:bg-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Go to Login
        </Link>
      </section>
    </main>
  );
}
