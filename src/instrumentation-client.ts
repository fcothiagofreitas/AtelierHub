import * as Sentry from "@sentry/nextjs";
import { getClientSentryOptions, getSentryDsn } from "@/lib/sentry-init";

if (getSentryDsn()) {
  Sentry.init(getClientSentryOptions());
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
