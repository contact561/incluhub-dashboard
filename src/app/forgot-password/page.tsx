export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <div className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900">
          Reset Password
        </h1>
        <p className="text-sm text-zinc-500">
          Enter your email address and we will send you a password reset link.
        </p>
        {/* Password reset form — added in Prompt 3: Auth + Role Redirect */}
      </div>
    </div>
  );
}
