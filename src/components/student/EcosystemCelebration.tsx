import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  ExternalLinkIcon,
  SparklesIcon,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EcosystemConfig } from "@/lib/config/ecosystem";

type EcosystemCelebrationProps = {
  studentName: string;
  teamName: string;
  programName: string | null;
  config: EcosystemConfig;
};

const CONFETTI_PIECES = Array.from({ length: 30 }, (_, index) => ({
  id: index,
  left: `${(index * 37 + 7) % 100}%`,
  delay: `${-((index * 17) % 48) / 10}s`,
  duration: `${4.8 + ((index * 13) % 24) / 10}s`,
  drift: `${((index % 7) - 3) * 13}px`,
}));

export function EcosystemCelebration({
  studentName,
  teamName,
  programName,
  config,
}: EcosystemCelebrationProps) {
  const firstName = studentName.trim().split(/\s+/)[0] || "there";

  return (
    <section className="relative isolate min-h-[calc(100dvh-8rem)] overflow-hidden rounded-[var(--radius-card)] border border-border-default bg-[radial-gradient(circle_at_top,var(--surface-card)_0%,var(--brand-gold-soft)_45%,var(--surface-page)_100%)] px-4 py-10 sm:px-8 sm:py-14">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        {CONFETTI_PIECES.map((piece) => (
          <span
            key={piece.id}
            className="ecosystem-confetti-piece"
            style={
              {
                left: piece.left,
                animationDelay: piece.delay,
                animationDuration: piece.duration,
                "--confetti-drift": piece.drift,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <div className="pointer-events-none absolute -left-24 top-1/3 size-72 rounded-full bg-brand-primary-soft/80 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-10 size-64 rounded-full bg-status-success-soft/70 blur-3xl" />

      <div className="relative mx-auto flex max-w-2xl flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-status-success/25 bg-status-success-soft px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-status-success">
          <CheckCircle2Icon className="size-4" aria-hidden />
          Programme complete
        </div>

        <div className="mt-7 grid size-36 place-items-center rounded-full border border-white/80 bg-white/90 shadow-[0_24px_70px_rgba(107,31,42,0.16)] sm:size-44">
          <Image
            src={config.logoPath}
            alt={`${config.appName} logo`}
            width={144}
            height={144}
            className="size-28 object-contain sm:size-36"
            priority
            unoptimized
          />
        </div>

        <div className="mt-7 flex items-center gap-2 text-brand-primary">
          <SparklesIcon className="size-5" aria-hidden />
          <span className="text-sm font-semibold">Stage 5 achieved</span>
          <SparklesIcon className="size-5" aria-hidden />
        </div>

        <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-text-primary sm:text-5xl">
          Welcome to the {config.appName}
        </h1>
        <p className="mt-5 max-w-xl text-pretty text-base leading-7 text-text-muted sm:text-lg">
          Congratulations, {firstName}. You have successfully completed the
          IncluHub programme. Your ecosystem access is now active.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-text-subtle">
          <span className="rounded-full border border-border-default bg-white/70 px-3 py-1.5">
            {teamName}
          </span>
          {programName ? (
            <span className="rounded-full border border-border-default bg-white/70 px-3 py-1.5">
              {programName}
            </span>
          ) : null}
        </div>

        <div className="mt-9 w-full max-w-md rounded-[var(--radius-card)] border border-white/90 bg-white/80 p-4 shadow-sm backdrop-blur sm:p-5">
          {config.appUrl && !config.isPlaceholder ? (
            <a
              href={config.appUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-12 w-full px-6 text-base shadow-sm"
              )}
            >
              Enter the Ecosystem
              <ExternalLinkIcon className="ml-1 size-4" aria-hidden />
            </a>
          ) : (
            <p className="text-sm text-text-muted" role="status">
              The ecosystem destination is being configured. Please check back
              shortly.
            </p>
          )}

          {config.isPlaceholder ? (
            <p className="mt-3 text-xs leading-5 text-text-subtle">
              IncluHub will make the destination available here after the final
              application URL is configured.
            </p>
          ) : (
            <p className="mt-3 text-xs leading-5 text-text-subtle">
              The application opens in a new tab. IncluHub does not store an
              external application password.
            </p>
          )}
        </div>

        <Link
          href="/student/my-stage"
          className="mt-6 inline-flex min-h-11 items-center gap-2 px-3 text-sm font-medium text-text-muted underline-offset-4 hover:text-text-primary hover:underline"
        >
          <ArrowLeftIcon className="size-4" aria-hidden />
          View your stage journey
        </Link>
      </div>
    </section>
  );
}
