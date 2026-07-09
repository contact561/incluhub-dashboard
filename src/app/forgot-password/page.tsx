import { ForgotPasswordForm } from "@/components/forms/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900">
          Reset Password
        </h1>
        <p className="mb-6 text-sm text-zinc-500">
          Enter your email and we will send you a password reset link.
        </p>

        <ForgotPasswordForm />

        <p className="mt-6 text-center text-sm text-zinc-500">
          Don&apos;t have an account? Please contact your IncluHub
          Administrator.
        </p>
      </div>
    </div>
  );
}
