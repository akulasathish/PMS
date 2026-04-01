# Track: Staff Architect (Enterprise IAM)

## Overview
This track evolves the system from a static role-based model to a granular, capability-based permission system. It allows owners to define exactly which actions (Check-in, Check-out, Inventory Edit, etc.) a staff member can perform, regardless of their base title.

## Strategy
1.  **Action Registry:** Define a JSON schema for permissions that maps to specific UI buttons and backend server actions.
2.  **Template Engine:** Create a `role_templates` table to store reusable permission matrices.
3.  **UI Architect:** Build a high-precision multi-select/toggle UI in the Staff Invite modal.
4.  **Enforcement:** Update frontend components to conditionally render/disable buttons based on the new JSON permissions.

## Acceptance Criteria
- [ ] Owner can create a staff member with "Check-Out Only" access.
- [ ] UI buttons (e.g., "Check In") are grayed out or hidden if the user lacks the specific action permission.
- [ ] Owner can save a custom configuration as a "Front Office Junior" template.
- [ ] Existing staff default to their previous role's "Full Access" equivalent for that module.
