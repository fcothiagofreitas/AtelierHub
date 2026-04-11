import { LoginForm } from "@/modules/auth/components/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto flex size-10 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            AH
          </div>
          <h1 className="mt-4 text-xl font-semibold">Entrar no AtelierHub</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Use suas credenciais para acessar o sistema.
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
