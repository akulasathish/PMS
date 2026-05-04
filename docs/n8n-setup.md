# n8n Automation & Email Setup Guide

This guide explains how to set up the n8n automation engine for the RE-PMS system. Our architecture uses n8n to listen for database events (via Postgres Webhooks) and automatically send transactional emails to guests using the Resend API.

## Architecture Overview
1. **Trigger:** A staff member creates a booking in the Tier 3 Front Desk.
2. **Database:** Supabase fires a Postgres Trigger (`AFTER INSERT`) containing the booking details.
3. **n8n (Automation):** The n8n Webhook catches the payload.
4. **Resend (Email):** n8n formats the data and sends an HTTP POST request to Resend to deliver the Welcome Email.

---

## Why Resend?
We use [Resend](https://resend.com/) instead of traditional SMTP servers (like Sendgrid or Mailgun) because:
* **Developer Experience:** It has a clean, modern REST API that integrates flawlessly with n8n's HTTP Request nodes.
* **Deliverability:** It is built for modern applications, ensuring transactional emails (like booking confirmations) don't end up in spam.
* **Speed:** It relies on edge networks to deliver emails incredibly fast.

---

## Step-by-Step Setup

### Step 1: Install and Start n8n
n8n is packaged within our local infrastructure using Docker. You do not need to install it globally on your machine.

1. Open your terminal in the root of the project.
2. Run the following command to spin up the n8n container in the background:
   ```bash
   docker-compose up -d
   ```
3. Wait a few seconds for the container to boot up.

### Step 2: Access the n8n Dashboard
1. Open your web browser and navigate to: **`http://localhost:5678`**
2. If this is your first time booting n8n, you will be prompted to set up an initial admin account (email and password). Complete this setup to access the dashboard.

### Step 3: Import the Booking Workflow
We have pre-configured the exact node structure needed for the PMS. 

1. In the left-hand sidebar of n8n, click on **Workflows**.
2. Click the **Add Workflow** button in the top right corner.
3. In the new workflow screen, click the **Settings/Menu** icon (or use the dropdown) and select **Import from File**.
4. Browse to your project's root folder and select the `n8n-booking-workflow.json` or `n8n-smart-checkin-workflow.json` or `n8n-owner-invite-workflow.json` file.
5. You should now see the workflow nodes appear.

### Step 4: Configure the Resend API Key
To allow n8n to send emails on your behalf, you must securely add your Resend API key.

1. In the left-hand sidebar, click on **Credentials**.
2. Click **Add Credential** in the top right corner.
3. Search for **"Header Auth"** and select it.
4. Fill out the credential form exactly like this:
   * **Name:** `Resend API Key`
   * **Name (Header Name):** `Authorization`
   * **Value (Header Value):** `Bearer YOUR_RESEND_API_KEY` *(Note: You MUST include the word "Bearer " followed by a space before your actual key).*
5. Click **Save**.

### Step 5: Attach Credentials and Activate
1. Go back to your imported **Workflows**.
2. Double-click the **Resend API** node (HTTP Request) to open its settings.
3. In the left panel under **Authentication**, ensure it is set to **Header Auth**.
4. In the dropdown directly below that, select the `Resend API Key` credential you just created.
5. Close the node settings.
6. In the top-right corner of the workflow editor, toggle the switch from Inactive to **Active**.

## Available Workflows

### 1. Booking Confirmation (`n8n-booking-workflow.json`)
Fires when a new booking is created. Sends a generic welcome email.

### 2. Smart Check-In (`n8n-smart-checkin-workflow.json`)
Fires when status changes to "Checked In". Sends Room Number and WiFi credentials.

### 3. Owner Onboarding (`n8n-owner-invite-workflow.json`)
Fires when an Admin provisions a new Owner in Tier 1. Sends login portal link and assigned properties list.

### Step 6: Test the Integration
To verify everything is working:
1. Log into your local PMS Front Desk (`http://localhost:3000/front-desk/login`).
2. Create a new Walk-in Booking.
3. Go back to n8n and click on **Executions** in the left sidebar. You should see a successful execution log showing the webhook was received and the email was dispatched via Resend!