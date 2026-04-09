# Implementation Plan: Performance & Logs (Audit Trail)

## Phase 1: Database Setup
- [ ] Task: Create the `audit_logs` table migration with strict RLS.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Database Setup'

## Phase 2: Backend Integration
- [ ] Task: Update `booking.ts` actions to write to `audit_logs`.
- [ ] Task: Update `inventory.ts` actions to write to `audit_logs`.
- [ ] Task: Update `staff.ts` actions to write to `audit_logs`.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Backend Integration'

## Phase 3: Dashboard UI
- [ ] Task: Replace the placeholder "Recent Activity" widget on the Owner Dashboard with a live feed.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Dashboard UI'