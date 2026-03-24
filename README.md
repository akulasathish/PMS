# RE-PMS Engine 2026

A modern, 3-tier SaaS Property Management System (PMS) built for scale, security, and automation.

## Architecture & Tech Stack
- **Frontend:** Next.js 16 (App Router), React, Tailwind CSS v4
- **Backend & Auth:** Supabase (PostgreSQL, GoTrue)
- **Automation:** n8n (Dockerized)
- **Emails:** Resend API

## The 3-Tier Access Model
This platform enforces strict Role-Based Access Control (RBAC) at the Edge Middleware level:

1. **Tier 1 (Admin/Provider) - `/admin`**
   - Global Fleet Management.
   - Register new properties, assign tiers, and manage the "Kill Switch" (Suspend/Activate properties).
2. **Tier 2 (Owner/Executive) - `/dashboard`**
   - Property-specific management.
   - Manage room inventory, financial overviews, and provision Tier 3 Staff accounts.
3. **Tier 3 (Staff/Front-Desk) - `/front-desk`**
   - Operational terminal.
   - Manage the Availability Matrix (Tape Chart), process check-ins, and create Walk-in Bookings.

## n8n Automation & Webhooks
The system features a deeply integrated automation engine. 
When a new booking is created in the Front Desk terminal, a Postgres Database Trigger (`AFTER INSERT`) fires an HTTP POST request directly to a local `n8n` Docker container. n8n then processes the payload and uses the Resend API to dispatch a personalized HTML Welcome Email to the guest.

## Getting Started
Please see [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions on spinning up the local Docker environment, applying database migrations, and importing the n8n workflows.
