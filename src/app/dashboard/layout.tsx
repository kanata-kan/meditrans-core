export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-surface-light">
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
