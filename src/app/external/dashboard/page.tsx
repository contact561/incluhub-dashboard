import { notFound } from "next/navigation";

/**
 * External Member product work is outside the submission scope. Keep the
 * role-protected route non-discoverable without shipping a misleading stub.
 */
export default function ExternalDashboardPage() {
  notFound();
}
