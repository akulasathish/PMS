# Implementation Plan: Advanced Room Blocking

## Phase 1: Database Foundation
- [x] Task: Create `room_blocks` table migration with columns for type (OOO/OOS), start_date, end_date, reason, and notes.
- [x] Task: Build `createRoomBlock` server action with strict overlap checking against the `bookings` table. [bff1f00]
- [x] Task: Build `resolveRoomBlock` server action to return room to service. [1334470]
- [x] Task: Conductor - User Manual Verification 'Phase 2: Conflict Engine' [1334470]

## Phase 3: Front Office Integration
- [ ] Task: Build the Room Block Modal UI with date pickers and conflict warnings.
- [ ] Task: Replace the simple "Lock" toggle on Room Cards with the Modal trigger.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Front Office Integration'

## Phase 4: Housekeeping & Sync
- [ ] Task: Update Housekeeping Terminal to display active maintenance blocks.
- [ ] Task: Verify real-time status sync between modules.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Housekeeping & Sync'
