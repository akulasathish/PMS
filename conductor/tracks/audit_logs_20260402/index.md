# Track: Performance & Logs (Audit Trail)

## Overview
This track introduces a robust audit logging system to record all critical actions (check-ins, bookings, room status changes, and refunds) performed by any user. This satisfies the "Performance & Logs" requirement of the Tier 2 Owner Dashboard.

## Strategy
1.  **Database Architecture:** Create an `audit_logs` table in Supabase.
2.  **Server Action Integration:** Update all major operational server actions (e.g., `checkInGuest`, `markRoomCleaned`, `createBooking`) to write a log entry upon success.
3.  **Dashboard UI:** Create a "Recent Activity Feed" widget on the Owner Dashboard (`/dashboard/page.tsx`) to display the latest logs in real-time.

## Acceptance Criteria
- [ ] The `audit_logs` table exists with RLS isolating logs by `property_id`.
- [ ] Creating a booking, checking in/out, and cleaning a room all generate a log entry.
- [ ] The Owner Dashboard successfully fetches and renders the 10 most recent logs for the active property.