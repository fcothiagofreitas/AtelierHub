import { LoginForm } from "@/modules/auth/components/login-form";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const callbackUrlParam = resolvedSearchParams?.callbackUrl;
  const callbackUrl = Array.isArray(callbackUrlParam)
    ? callbackUrlParam[0]
    : callbackUrlParam;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 px-4 py-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.45),transparent_20%)]" />
      <div className="relative w-full max-w-md">
        <LoginForm callbackUrl={callbackUrl} />
      </div>
    </main>
  );
}
