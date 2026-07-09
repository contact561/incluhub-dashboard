import Link from "next/link";

export default function RootPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-zinc-900">
          IncluHub Dashboard
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Program workflow dashboard for IncluHub post-academic support.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Go to Login
        </Link>
      </div>
    </div>
  );
}
