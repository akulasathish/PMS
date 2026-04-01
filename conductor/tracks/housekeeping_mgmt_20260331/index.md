# Track: Housekeeping & Room Recovery Module

## Overview
This track introduces a dedicated housekeeping interface to manage rooms that are marked as "Dirty" (following a guest checkout) and return them to "Available" status.

## Strategy
1.  **Housekeeping View:** Create a dedicated page for cleaners or staff to see only "Dirty" rooms.
2.  **Room Recovery Action:** Build a server action to transition room status from `Dirty` to `Available`.
3.  **UI Feedback:** Ensure the Tape Chart and Dashboard stats update in real-time when a room is cleaned.

## Acceptance Criteria
- [ ] Dedicated UI page listing all "Dirty" rooms for the active property.
- [ ] Single-click "Mark as Cleaned" button per room.
- [ ] Room status successfully updates in the database.
- [ ] Cleaned rooms immediately reappear as "Available" in the Front Desk booking tools.
