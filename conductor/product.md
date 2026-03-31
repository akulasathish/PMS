# Product Definition - RE-PMS Engine 2026

## Initial Concept
A modern, 3-tier SaaS Property Management System (PMS) built for scale, security, and automation, using a database-as-an-event-source pattern.

## Product Vision
To provide a cohesive intelligence layer for multi-tier property management. Onboard entire portfolios, automate operations, and scale with precision using the Engine 2026 stack (Next.js 16 + Supabase + n8n).

## Target Users
- **Enterprise Admins (Tier 1):** SaaS providers managing the entire global fleet of properties.
- **Property Owners (Tier 2):** Hotel managers and owners overseeing specific property inventory and staff.
- **Front-Desk Staff (Tier 3):** Operational users handling daily guest interactions and bookings.

## Core Business Goals
- **Multi-tenant Security:** Enforce strict data isolation between properties using PostgreSQL Row Level Security (RLS) and Edge Middleware.
- **Process Automation:** Streamline the guest lifecycle (Check-in, Check-out, Welcoming) using event-driven n8n workflows.
- **Portfolio Management:** Provide a unified "Fleet Command" interface for enterprise-level oversight and control.

## Key Features (MVP Priority)
- **Fleet Command (T1):** Global property registration and an administrative "Kill Switch" for suspending/activating properties.
- **Owner Dashboard (T2):** Real-time financial reporting and revenue analytics for property managers.
- **Operational Terminal (T3):** An interactive Availability Matrix (Tape Chart) for managing bookings and walk-ins.
- **Automated Workflows:** Postgres-triggered webhooks for dispatching transactional guest emails via n8n and Resend.

## Success Metrics
- **Security & Compliance:** Zero unauthorized data access incidents between isolated tenants.
- **Operational Efficiency:** Reduction in manual repetitive tasks through automated check-in/out communications.
- **System Reliability:** Seamless execution of the "database-as-an-event-source" automation pattern.
