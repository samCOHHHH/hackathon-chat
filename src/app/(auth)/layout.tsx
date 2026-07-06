export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-10%] h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-[-10%] right-[10%] h-[400px] w-[400px] rounded-full bg-accent/40 blur-3xl" />
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
