import Image from "next/image";
import { redirect } from "next/navigation";
import { StudentOnboardingForm } from "@/components/forms/StudentOnboardingForm";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";
import { logoutAction } from "@/actions/auth/logout";
import { Button } from "@/components/ui/button";

export default async function StudentOnboardingPage() {
  const profile = await getCurrentProfile();

  if (!profile || profile.role !== "student") {
    redirect("/login");
  }

  if (profile.status === "active") {
    redirect("/student/dashboard");
  }

  if (profile.status !== "pending_onboarding") {
    redirect("/login?error=account_not_active");
  }

  const supabase = await createClient();
  const { data: institutes } = await supabase
    .from("institutes")
    .select("id, name")
    .eq("status", "active")
    .order("name");

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-page px-4 py-10">
      <div className="w-full max-w-md rounded-lg border border-border-default bg-surface-card p-8 shadow-sm">
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
            Complete your profile
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Tell us your institute and category so your educator can see you.
          </p>
        </div>

        <StudentOnboardingForm
          institutes={institutes ?? []}
          defaultFullName={profile.full_name}
        />

        <form action={logoutAction} className="mt-6">
          <Button type="submit" variant="ghost" className="w-full">
            Sign out
          </Button>
        </form>
      </div>
    </div>
  );
}
