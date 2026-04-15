import type { BrowserOptions } from "@sentry/nextjs";

/** DSN público (browser + pode ser lido no servidor Node). Sem DSN, o SDK não inicializa. */
export function getSentryDsn(): string | undefined {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();
  return dsn || undefined;
}

export function getClientSentryOptions(): BrowserOptions {
  return {
    dsn: getSentryDsn(),
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === "development" ? 0.3 : 0.08,
    sendDefaultPii: false,
  };
}
