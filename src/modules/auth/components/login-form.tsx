"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type LoginInput, loginSchema } from "@/modules/auth/schemas/login-schema";

type LoginFormProps = {
  callbackUrl?: string;
};

export function LoginForm({ callbackUrl = "/dashboard" }: LoginFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginInput) {
    setSubmitError(null);

    const result = await signIn("credentials", {
      ...values,
      redirect: false,
      callbackUrl,
    });

    if (!result || result.error) {
      setSubmitError("E-mail ou senha invalidos.");
      return;
    }

    router.push(result.url ?? callbackUrl);
    router.refresh();
  }

  return (
    <Card className="w-full rounded-[2rem] border-white/70 bg-white/88 shadow-[0_20px_80px_-32px_rgba(43,32,22,0.28)] backdrop-blur-xl">
      <CardHeader className="space-y-4 p-7 pb-5">
        <div className="flex items-center justify-between">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-[1.1rem] bg-zinc-950 text-white shadow-sm">
            <LockKeyhole className="size-5" />
          </div>
          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-500">
            Credenciais
          </span>
        </div>
        <div className="space-y-2">
          <CardTitle className="text-[1.75rem] tracking-tight">
            Acessar workspace
          </CardTitle>
          <CardDescription className="text-sm leading-6 text-zinc-500">
            Use o usuario criado pela area administrativa para acessar o MVP.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 p-7 pt-0">
        <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2.5">
            <Label htmlFor="email" className="text-sm font-medium text-zinc-600">
              E-mail
            </Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-zinc-400" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="voce@empresa.com"
                className="h-12 rounded-2xl border-zinc-200 bg-zinc-50/80 pl-11 shadow-none transition focus-visible:bg-white"
                {...form.register("email")}
              />
            </div>
            {form.formState.errors.email ? (
              <p className="text-sm text-red-600">
                {form.formState.errors.email.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="password" className="text-sm font-medium text-zinc-600">
              Senha
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="Sua senha"
              className="h-12 rounded-2xl border-zinc-200 bg-zinc-50/80 shadow-none transition focus-visible:bg-white"
              {...form.register("password")}
            />
            {form.formState.errors.password ? (
              <p className="text-sm text-red-600">
                {form.formState.errors.password.message}
              </p>
            ) : null}
          </div>

          {submitError ? (
            <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          ) : null}

          <Button
            type="submit"
            className="h-12 w-full rounded-2xl bg-zinc-950 text-white shadow-sm transition hover:bg-zinc-800"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? (
              <>
                <LoaderCircle className="mr-2 size-4 animate-spin" />
                Entrando...
              </>
            ) : (
              "Entrar"
            )}
          </Button>
        </form>
        <div className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50/70 px-4 py-4 text-sm text-zinc-500">
          Base inicial do MVP com auth, Prisma e estrutura modular prontos para a Sprint 2.
        </div>
      </CardContent>
    </Card>
  );
}
