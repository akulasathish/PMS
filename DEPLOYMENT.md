# RE-PMS Engine 2026: Deployment & Migration Guide

This guide explains how to quickly rebuild the RE-PMS system on a new machine, server, or cloud provider (e.g., AWS, Azure, Supabase Cloud) without starting from scratch.

## System Architecture
* **Frontend:** Next.js 16
* **Database:** Supabase (PostgreSQL)
* **Automation:** n8n (Dockerized)

## Prerequisites
Before you begin, ensure you have the following installed:
* Docker & Docker Compose
* Node.js & npm
* Supabase CLI (`npm i -g supabase`)

---

## The 3-Step Rebuild Process

### 1. Spin up the Infrastructure
Start by launching the `n8n` automation engine via Docker Compose.
```bash
docker-compose up -d
```

### 2. Apply Migrations & Seed Data
Initialize the Supabase database. This will automatically apply all schema migrations (capturing the full "DNA" of the database including RLS and Postgres Triggers) and inject the base seed data so you don't start with a blank screen.
```bash
npx supabase start
npx supabase db reset
```

**What the Seed Data includes:**
* **Tier 1 (Admin):** `admin@pms.com` / `password123`
* **Tier 2 (Owner):** `owner@demo.com` / `password123` (Linked to "The Grand Demo Hotel")
* **Tier 3 (Staff):** `staff@demo.com` / `password123`
* **Rooms:** Pre-configured Standard and Suite rooms.

### 3. Restore n8n Automation
Import the email automation workflow into n8n:
1. Navigate to your n8n instance (e.g., `http://localhost:5678`).
2. Create your initial admin account if prompted.
3. Click **Add Workflow** -> **Import from File**.
4. Select the `n8n-booking-workflow.json` file found in the root directory.
5. Add your **Resend API Key** to the HTTP Request node credentials.
6. Toggle the workflow to **ACTIVE** (top-right corner).

---

## Dynamic Webhook Configuration (Cloud Deployment)

The Postgres Trigger (`on_booking_created`) is designed to send an HTTP POST request to n8n whenever a new booking is created.

If you deploy this stack to a cloud provider like AWS instead of running it locally, the database needs to know the new public IP or domain name for n8n.

You **do not** need to rewrite any SQL to fix this. Instead, simply update the `app_settings` table in the database:

```sql
UPDATE public.app_settings 
SET value = 'http://<YOUR_AWS_PUBLIC_IP>:5678/webhook/booking-notification' 
WHERE key = 'n8n_webhook_url';
```

Once updated, the Postgres trigger will automatically start routing Welcome Emails to your cloud-hosted n8n instance!
