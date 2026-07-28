import { PublicAuthCard } from "@/components/auth/PublicAuthCard";
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
    <PublicAuthCard
      title="Education Management System"
      description="Sign in to access your dashboard."
      footer={
        <p>
          Don&apos;t have an account? Please contact your IncluHub
          Administrator.
        </p>
      }
    >
      {queryError ? (
        <p className="mb-4 text-sm text-destructive" role="alert">
          {queryError}
        </p>
      ) : null}

      <LoginForm />
    </PublicAuthCard>
  );
}
