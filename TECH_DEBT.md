# Technical Debt & Future Improvements

While the core architecture is stable and secure, the following technical debt items should be addressed in future sprints before a full production launch:

### 1. Hardcoded Dummy Passwords
- **Current State:** The `registerProperty` and `addStaff` Server Actions generate random string passwords and return them directly in the UI. 
- **Action Required:** Transition to Supabase's native `inviteUserByEmail` flow. Users should receive a secure link to set their own passwords, removing the need to ever expose or handle raw passwords in the Next.js application.

### 2. Over-reliance on Service Role Key
- **Current State:** Due to the complexity of inserting cross-table data (e.g., creating a User and a Profile simultaneously), Server Actions currently rely on the `SUPABASE_SERVICE_ROLE_KEY` to bypass Row Level Security (RLS), though this is manually protected by role checks in the code.
- **Action Required:** Write strict RLS policies in the Postgres database that securely allow authenticated `owner` or `admin` roles to perform these inserts using their standard anonymous client token. This acts as a defense-in-depth layer.

### 3. Tape Chart Real-time Sync
- **Current State:** The Front Desk Availability Matrix updates when a booking is made via the Next.js `revalidatePath` function.
- **Action Required:** Implement Supabase Realtime subscriptions on the `bookings` and `rooms` tables so the tape chart updates instantly across all connected staff terminals without requiring a page refresh or Next.js server revalidation.

### 4. Payment Gateway Integration
- **Current State:** The "Kill Switch" (Property Suspension) is manual.
- **Action Required:** Integrate Stripe or another payment provider. Use webhooks from the payment provider to automatically update the `app_settings` or `properties.status` table if a subscription fails.
