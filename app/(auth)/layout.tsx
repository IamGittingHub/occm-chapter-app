export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-warm-white">
      <div className="w-full max-w-md px-4">
        {/* OCCM Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-deep-blue mb-4">
            <span className="text-2xl font-bold text-gold">O</span>
          </div>
          <h1 className="text-2xl font-bold text-deep-blue">OCCM Chapter Management</h1>
          <p className="text-muted-foreground mt-1">
            Orthodox Christian Campus Ministries
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
