import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "https://b0a2ec5604c3fa63bbeca4f3f7a7db6a@o4511267515990016.ingest.us.sentry.io/4511267521822720",
  tracesSampleRate: 1.0,
  debug: false,
});
