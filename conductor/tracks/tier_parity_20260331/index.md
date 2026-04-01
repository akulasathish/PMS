# Track: Tier 2/3 Feature Parity (Executive Operations)

## Overview
This track focuses on empowering Tier 2 Owners with the same operational capabilities as Tier 3 Staff. This allows owners to perform front-desk duties (bookings, check-ins, check-outs) directly from their executive dashboard.

## Strategy
1.  **Shared Components:** Extract the Tape Chart and Booking Matrix from Tier 3 into reusable shared components or simply mirror the logic.
2.  **Navigation:** Add an "Operations" or "Front Desk" tab to the Tier 2 sidebar.
3.  **Role Elevation:** Ensure server actions for bookings/check-ins explicitly allow the `owner` role.

## Acceptance Criteria
- [ ] Tier 2 Sidebar contains a "Front Desk" link.
- [ ] Tier 2 "Front Desk" page displays the same interactive Tape Chart as Tier 3.
- [ ] Owner can create a walk-in booking and receive the same success feedback.
- [ ] Owner can perform Check-In and Check-Out actions.
