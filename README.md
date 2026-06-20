# StaySync PMS Engine

A modern, cloud-native Property Management System (PMS) built for scale, security, and absolute simplicity. StaySync empowers operators with frictionless self-service onboarding, intuitive inventory management, and automated guest operations.

## Architecture & Tech Stack
- **Frontend:** Next.js 15 (App Router), React, Tailwind CSS
- **Backend & Auth:** Supabase (PostgreSQL, GoTrue)
- **Automation:** n8n (Dockerized)
- **Emails:** Resend API

## Platform Features
1. **Self-Service Onboarding:** Sign up directly via `/signup`, instantly log in, and register your property to begin operations.
2. **Property Management:** Comprehensive control over room inventory, pricing, and property configurations.
3. **Operational Terminal:** Real-time Availability Matrix (Tape Chart), check-in/check-out flows, and walk-in bookings.
4. **Housekeeping Terminal:** Real-time room status tracking, cleaning updates, and maintenance coordination.
5. **Role-Free 1-Tier Model:** Simple, secure architecture. Your account is your workspace—no complex RBAC matrices, no multi-level permissions, and no admin approval gates.

## n8n Automation & Webhooks
The system features a deeply integrated automation engine.
When a new booking is created in the Front Desk terminal, a Postgres Database Trigger (`AFTER INSERT`) fires an HTTP POST request directly to a local `n8n` Docker container. n8n then processes the payload and uses the Resend API to dispatch a personalized HTML Welcome Email to the guest.

## Getting Started
Please register a fresh account locally by visiting `http://localhost:3000/signup`. This will guide you straight to the Property Setup and into the fully unlocked main dashboard!
