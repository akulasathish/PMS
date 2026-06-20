# Product Definition - RE-PMS Engine 2026

## Initial Concept
A modern, single-tier SaaS Property Management System (PMS) built for scale, security, and automation, using a database-as-an-event-source pattern.

## Product Vision
To provide a cohesive intelligence layer for property management. Empower property owners with instant self-service onboarding, automated operations, and precise portfolio scaling using the Engine 2026 stack (Next.js 16 + Supabase + n8n).

## Target Users
- **Property Owners / Managers:** Overseeing property inventory, staff accounts, settings, and executive dashboard analytics.
- **Front-Desk Staff:** Handing daily guest interactions, room allocations, walk-in bookings, and operational workflows.

## Core Business Goals
- **Multi-tenant Security:** Enforce strict data isolation between properties using PostgreSQL Row Level Security (RLS) and Edge Middleware.
- **Process Automation:** Streamline the guest lifecycle (Check-in, Check-out, Welcoming) using event-driven n8n workflows.
- **Self-Service Growth:** Eliminate manual administrative gateways to allow properties to register, configure rooms, and launch operations instantly.

## Key Features (MVP Priority)
- **Self-Service Onboarding:** Sign up, log in, and register a property instance immediately via the dashboard.
- **Owner Dashboard:** Real-time financial reporting and revenue analytics for property owners.
- **Operational Terminal:** An interactive Availability Matrix (Tape Chart) for managing bookings, check-ins, and walk-ins.
- **Automated Workflows:** Postgres-triggered webhooks for dispatching transactional guest emails via n8n and Resend.

## Success Metrics
- **Security & Compliance:** Zero unauthorized data access incidents between isolated tenants.
- **Operational Efficiency:** Reduction in manual repetitive tasks through automated check-in/out communications.
- **System Reliability:** Seamless execution of the "database-as-an-event-source" automation pattern.
