# Implementation Plan: Staff Architect (Enterprise IAM)

## Phase 1: Database & Templates
- [ ] Task: Create `role_templates` table in Supabase.
- [ ] Task: Seed default templates (Guest Journey, Night Auditor, etc.).
- [ ] Task: Update `addStaff` action to accept permission JSON.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Database & Templates'

## Phase 2: The Architect UI
- [ ] Task: Rebuild the "Invite Staff" modal with an Accordion Permission Matrix.
- [ ] Task: Add "Save as Template" functionality to the modal.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: The Architect UI'

## Phase 3: Capability Enforcement
- [ ] Task: Create a `hasCapability(capabilityName)` frontend hook.
- [ ] Task: Wrap "Check In", "Check Out", and "New Walk-In" buttons with the hook.
- [ ] Task: Implement backend verification in server actions.
- [ ] Task: Build `revokeStaffAccess` server action for Tier 2 Owners.
- [ ] Task: Add "Delete Staff" button and confirmation modal to `/dashboard/staff`.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Capability Enforcement'
