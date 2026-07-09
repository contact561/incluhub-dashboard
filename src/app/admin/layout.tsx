export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-zinc-50">
      {/* Admin sidebar — added in a later prompt */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
