# Track: Inventory Control (Advanced Room Blocking)

## Overview
This track implements the Enterprise-grade Calendar Block system. It moves beyond simple status toggles to a date-range based system with conflict resolution (preventing blocks on occupied rooms) and maintenance tracking.

## Goals
- Create a persistent record of room blocks (Out of Order vs Out of Service).
- Prevent revenue loss by mathematically blocking check-ins/bookings on maintenance dates.
- Synchronize maintenance status across Front Office and Housekeeping.

## Implementation Standard
- **TDD:** All server actions must have Vitest unit tests covering conflict edge cases.
- **Surgical:** No broad database resets.
- **Single Source of Truth:** Centralized database logic.
