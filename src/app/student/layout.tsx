export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-zinc-50">
      {/* Student sidebar — added in a later prompt */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
