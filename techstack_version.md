# Project Tech Stack Versions

This document lists the key technologies and their versions used in the RE-PMS Engine 2026 project.

## Core Frameworks & Languages

*   **Next.js:** 16.2.1
*   **React:** 19.2.4
*   **TypeScript:** ^5.x (as per devDependencies)
*   **Node.js:** (Determined by Next.js and Dockerfile base image)

## Backend / Database

*   **Supabase Client (`@supabase/supabase-js`):** 2.99.3
*   **Supabase SSR (`@supabase/ssr`):** 0.9.0
*   **Supabase CLI (`supabase` dev dependency):** 2.83.0
*   **PostgreSQL:** (Version determined by Supabase's backend, typically a recent major version)

## Styling

*   **Tailwind CSS:** ^4.2.2
*   **PostCSS:** ^8.5.13
*   **Autoprefixer:** ^10.5.0
*   **`@tailwindcss/postcss`:** ^4.2.4

## UI & Utilities

*   **Framer Motion:** ^12.38.0
*   **Lucide React:** ^0.577.0
*   **Qrcode.react:** ^4.2.0

## Testing

*   **Vitest:** ^4.1.4
*   **`@testing-library/react`:** ^16.3.2
*   **`@testing-library/dom`:** ^10.4.1
*   **JSDOM (`jsdom`):** ^29.0.2
*   **`@vitejs/plugin-react`:** ^6.0.1

## Linting

*   **ESLint:** ^9.x (as per devDependencies)
*   **`eslint-config-next`:** 16.2.1

## Monitoring & Automation

*   **Sentry (`@sentry/nextjs`):** ^10.51.0
*   **Prom-client:** ^15.1.3
*   **n8n:** `latest` (from docker-local/docker-compose.yml, typically keeps up-to-date)

## Other Development Tools

*   **`babel-plugin-react-compiler`:** 1.0.0

---
