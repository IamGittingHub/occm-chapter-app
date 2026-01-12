import Image from 'next/image';

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
          <Image
            src="/occm-logo.png"
            alt="OCCM Logo"
            width={80}
            height={80}
            className="mx-auto mb-4"
            priority
          />
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
