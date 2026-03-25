# RE-PMS Engine 2026: Architecture Map

This document visually outlines the strict 3-tier Role-Based Access Control (RBAC) architecture, the data flow, and the automation integrations within the Property Management System.

## System Architecture Diagram

```mermaid
graph TD
    %% Define Styles
    classDef frontend fill:#1E1E24,stroke:#6366F1,stroke-width:2px,color:#fff
    classDef backend fill:#0F172A,stroke:#10B981,stroke-width:2px,color:#fff
    classDef automation fill:#1E1E24,stroke:#F59E0B,stroke-width:2px,color:#fff
    classDef external fill:#1E1E24,stroke:#EC4899,stroke-width:2px,color:#fff

    %% Components
    subgraph Frontend [Next.js App Router UI]
        T1["Tier 1: Admin Fleet Manager (/admin)"]:::frontend
        T2["Tier 2: Owner Dashboard (/dashboard)"]:::frontend
        T3["Tier 3: Staff Front Desk (/front-desk)"]:::frontend
    end

    subgraph Database [Supabase Database & Auth]
        Auth["GoTrue Authentication"]:::backend
        DB[("PostgreSQL Database (Properties, Rooms, Bookings)")]:::backend
        
        T1 -->|Provisions Properties & Owners| DB
        T2 -->|Adds Rooms & Analyzes Occupancy| DB
        T3 -->|Assigns Rooms & Updates Booking Status| DB
        
        Trigger1["PG Trigger: AFTER INSERT (Booking Created)"]:::backend
        Trigger2["PG Trigger: AFTER UPDATE (Status = Checked In)"]:::backend
        
        DB -.->|Status = Confirmed| Trigger1
        DB -.->|Status = Checked In| Trigger2
    end

    subgraph n8n Automation [n8n Automation Engine]
        WH1("Webhook: /webhook/booking-notification"):::automation
        WH2("Webhook: /webhook/smart-checkin"):::automation
        ResendHTTP("HTTP Request: Resend Email API"):::automation
        
        Trigger1 ==>|POST JSON Payload (Guest details)| WH1
        Trigger2 ==>|POST JSON Payload (WiFi & Room data)| WH2
        
        WH1 -->|Formats HTML Welcome Email| ResendHTTP
        WH2 -->|Formats HTML WiFi Check-In Email| ResendHTTP
    end

    subgraph External [External Services]
        ResendAPI["Resend Email Service"]:::external
        GuestInbox(("Guest Inbox")):::external
        
        ResendHTTP -->|Bearer Token Auth| ResendAPI
        ResendAPI -->|Delivers Transactional Email| GuestInbox
    end
```

---

## Feature Parity: The Shared `rooms` Table

The RE-PMS system relies on a single source of truth for physical inventory: the `rooms` table. However, each Tier interacts with this exact same table in completely different ways, ensuring feature parity without data duplication.

### 1. Admin (Create / Provision)
While the Admin primarily provisions the parent *Property*, they maintain global oversight over the physical inventory limits. The Admin tier establishes the schema constraints (e.g., maximum rooms per tier: Starter vs. Enterprise) and monitors total fleet capacity across all properties.

### 2. Staff (Use / Operate)
The Tier 3 Front Desk staff use the `rooms` table as an interactive, real-time matrix. 
* **The Tape Chart:** Staff rely on the `status` column (`Available`, `Occupied`, `Dirty`) to assign incoming walk-ins.
* **Operations:** When a staff member clicks the "Check-In Guest" button, they are effectively locking a specific `room_id` to a `booking_id`, transitioning the physical room from "Available" to "Occupied".

### 3. Owner (Analyze / Manage)
The Tier 2 Owner interacts with the `rooms` table purely from a managerial and analytical perspective.
* **Inventory Management:** Owners create the actual records (adding "Room 101" or "Suite 500") via the `/dashboard/inventory` panel.
* **Occupancy Analytics:** The dashboard calculates the real-time Occupancy Rate by counting the number of `Occupied` rooms divided by the total number of rooms in the property, translating physical space into actionable financial metrics.
