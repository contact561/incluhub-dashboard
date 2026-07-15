import { StatusPanel } from "@/components/status";
import { PageHeader } from "@/components/layout/PageHeader";

type AdminPlaceholderPageProps = {
  title: string;
  description: string;
};

/**
 * Consistent “Coming later” presentation for Admin nav placeholders.
 * Does not simulate data or actions.
 */
export function AdminPlaceholderPage({
  title,
  description,
}: AdminPlaceholderPageProps) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />
      <StatusPanel
        variant="information"
        title="Coming later"
        description="This area is planned for a future release. Navigation badges remain visible so Admins know the feature is on the roadmap — there is no operational data or action here yet."
      />
    </div>
  );
}
