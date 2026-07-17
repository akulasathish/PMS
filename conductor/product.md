# Product Definition - StaySync PMS Engine 2026

## Initial Concept
A modern, single-tier, role-free self-service Property Management System (PMS) built for scale, security, and automation, using a database-as-an-event-source pattern.

## Product Vision
To provide a cohesive intelligence layer for property management. Empower property owners with instant self-service onboarding, automated operations, and precise portfolio scaling using the Engine 2026 stack (Next.js 16 + Supabase + n8n).

## Target Users
- **Property Owners / Managers:** Complete autonomous control over their property workspace, managing room inventory, bookings, housekeeping, and viewing dashboard analytics.
- **Unified Staff / Operators:** Direct, role-free dashboard access to handle all operational workflows (front desk tape chart, check-in checklists, housekeeping QC loop, and folio management) without hierarchical administrative gating.

## Core Business Goals
- **Multi-tenant Security:** Enforce strict data isolation between properties using PostgreSQL Row Level Security (RLS) and Edge Middleware.
- **Process Automation:** Streamline the guest lifecycle (Check-in, Check-out, Welcoming) using event-driven n8n workflows.
- **Self-Service Growth:** Eliminate manual administrative gateways to allow properties to register, configure rooms, and launch operations instantly.

## Key Features (MVP Priority)
- **Self-Service Onboarding:** Frictionless public onboarding flow at `/signup` and wizard at `/dashboard/property-setup` allowing instant registration and room configuration.
- **Operational Terminal:** Interactive Availability Matrix (Tape Chart) supporting monthly co-living room cards with tabbed bed selectors.
- **Front Office Suite:** Tabbed interfaces for daily operational lists (Arrivals, Departures, In-House), master reservation search, and transactional actions (Room upgrades, Refund folios).
- **Enterprise Check-In Guardrails:** 3-step compliance checklist (ID, Signature, Payment) locking check-in.
- **Housekeeping QC Loop:** Mobile task workflow transitioning through `Dirty` ➡️ `Clean` ➡️ `Inspected` with cleaner timers.
- **Professional Folio Engine:** Incidental charges posting, gst-compliant invoicing, and checkout balance enforcement.

## Success Metrics
- **Security & Compliance:** Zero unauthorized data access incidents between isolated tenants.
- **Operational Efficiency:** Reduction in manual repetitive tasks through automated check-in/out communications.
- **System Reliability:** Seamless execution of the "database-as-an-event-source" automation pattern.
