import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type WhatHappensNowProps = {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
};

export function WhatHappensNow({ title, description, actionLabel, actionHref }: WhatHappensNowProps) {
  return <aside className="rounded-[var(--radius-card)] border border-brand-primary/25 bg-brand-primary/5 p-4">
    <p className="text-xs font-semibold uppercase tracking-wide text-brand-primary">What happens now?</p>
    <h2 className="mt-1 font-semibold text-text-primary">{title}</h2>
    <p className="mt-1 text-sm text-text-muted">{description}</p>
    {actionLabel && actionHref ? <Link href={actionHref} className={cn(buttonVariants({ size: "sm" }), "mt-3")}>
      {actionLabel}<ArrowRight aria-hidden="true" />
    </Link> : null}
  </aside>;
}

