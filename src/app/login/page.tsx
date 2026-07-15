import Image from "next/image";
import { LoginForm } from "@/components/forms/LoginForm";

const LOGIN_ERRORS: Record<string, string> = {
  account_not_setup:
    "Your account is not fully set up. Please contact IncluHub Admin.",
  account_not_active:
    "Your account is not active. Please contact IncluHub Admin.",
  auth_callback_failed:
    "Authentication failed. Please try again or contact IncluHub Admin.",
};

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const queryError = params.error ? LOGIN_ERRORS[params.error] : undefined;

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-page px-4">
      <div className="w-full max-w-sm rounded-lg border border-border-default bg-surface-card p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image
            src="/brand/incluhub-logo.svg"
            alt="IncluHub"
            width={56}
            height={56}
            className="h-14 w-14 object-contain"
            priority
            unoptimized
          />
          <h1 className="mt-3 text-xl font-semibold text-text-primary">
            IncluHub
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Education Management System
          </p>
        </div>

        <p className="mb-6 text-center text-sm text-text-muted">
          Sign in to access your dashboard.
        </p>

        {queryError ? (
          <p className="mb-4 text-sm text-destructive" role="alert">
            {queryError}
          </p>
        ) : null}

        <LoginForm />

        <p className="mt-6 text-center text-sm text-text-muted">
          Don&apos;t have an account? Please contact your IncluHub
          Administrator.
        </p>
      </div>
    </div>
  );
}
