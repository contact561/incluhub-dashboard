import { PublicAuthCard } from "@/components/auth/PublicAuthCard";
import { ForgotPasswordForm } from "@/components/forms/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <PublicAuthCard
      title="Reset Password"
      description="Enter your email and we will send you a password reset link."
      footer={
        <p>
          Don&apos;t have an account? Please contact your IncluHub
          Administrator.
        </p>
      }
    >
      <ForgotPasswordForm />
    </PublicAuthCard>
  );
}
