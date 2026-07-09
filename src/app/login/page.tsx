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
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900">
          IncluHub Login
        </h1>
        <p className="mb-6 text-sm text-zinc-500">
          Sign in to access your dashboard.
        </p>

        {queryError ? (
          <p className="mb-4 text-sm text-destructive" role="alert">
            {queryError}
          </p>
        ) : null}

        <LoginForm />

        <p className="mt-6 text-center text-sm text-zinc-500">
          Don&apos;t have an account? Please contact your IncluHub
          Administrator.
        </p>
      </div>
    </div>
  );
}
