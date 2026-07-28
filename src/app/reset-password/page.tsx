import Link from "next/link";
import { PublicAuthCard } from "@/components/auth/PublicAuthCard";
import { ResetPasswordForm } from "@/components/forms/ResetPasswordForm";
import { createClient } from "@/lib/supabase/server";

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <PublicAuthCard
      title="Choose a new password"
      description={
        user
          ? "Secure your IncluHub account with a new password."
          : "Your password reset session is not available."
      }
      footer={
        <Link
          href={user ? "/login" : "/forgot-password"}
          className="font-medium text-brand-primary hover:underline"
        >
          {user ? "Return to login" : "Request a new reset link"}
        </Link>
      }
    >
      {user ? (
        <ResetPasswordForm />
      ) : (
        <p className="text-sm leading-6 text-text-muted" role="alert">
          This reset link is invalid or has expired. Request a new password
          reset email to continue.
        </p>
      )}
    </PublicAuthCard>
  );
}
