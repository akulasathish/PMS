# Track Specification: Implement Financial Reporting & Analytics (T2)

## Overview
This track implements the financial reporting dashboard for Tier 2 (Property Owners), providing a 30-day revenue overview for their assigned property.

## User Stories
- As a Property Owner (T2), I want to see a chart of my property's total revenue over the last 30 days.
- As a Property Owner (T2), I want to see a breakdown of revenue by room type or booking source.

## Technical Requirements
- **Data Fetching:** Create a Supabase RPC or view to aggregate booking revenue by day.
- **Frontend:** Implement a chart component (e.g., using a lightweight charting library or SVG) in the Tier 2 dashboard.
- **Security:** Ensure the query strictly respects RLS policies for the authenticated owner's `property_id`.

## Success Criteria
- Owners can view a functional revenue chart on their dashboard.
- Data accurately reflects the total revenue from confirmed bookings.
