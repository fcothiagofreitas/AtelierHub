import * as Sentry from "@sentry/nextjs";
import { getSentryDsn } from "@/lib/sentry-init";

const dsn = getSentryDsn();
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === "development" ? 0.3 : 0.08,
    sendDefaultPii: false,
  });
}
