export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <div className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900">
          IncluHub Login
        </h1>
        <p className="text-sm text-zinc-500">
          Enter your credentials to access your dashboard. Contact the admin if
          you do not have an account.
        </p>
        {/* Auth form — added in Prompt 3: Auth + Role Redirect */}
      </div>
    </div>
  );
}
