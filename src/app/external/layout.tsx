export default function ExternalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-zinc-50">
      {/* External member sidebar — added in a later prompt */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
