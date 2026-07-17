# Product Guidelines - StaySync PMS Engine 2026

## Design Aesthetic
- **Accessible Operations:** Utilitarian, accessibility-first design for efficient property operations across all workspaces.
- **Minimalist Interaction:** Clean layouts with subtle, high-performance animations (Framer Motion) to enhance the user experience without being distracting.
- **Premium Aesthetics:** Sleek, modern dashboards using curated, high-contrast dark themes and clear operational metrics to present professional indicators.

## Tone & Voice
- **Empathetic & Guiding:** Support operators and staff with a helpful, guiding voice throughout the application.
- **Professionalism:** Maintain a high standard of professional communication, especially in guest-facing automated messaging.

## UX Principles
- **Unified Self-Service UX:** A single-tier, flat architecture with zero gateways or role restrictions. Users have unrestricted capabilities to manage properties, rooms, and bookings where they are the owner/creator.
- **Low Latency UI:** Prioritize near-instant updates through Supabase Realtime, ensuring the frontend reflects operational updates immediately.
- **Error Resiliency:** Implement clear, actionable error states, particularly for authentication and access control, to guide users back to safety.

## Automated Guest Communications
- **Premium Hospitality:** Guest-facing emails (Welcome, Smart Check-In, Checkout) must be rich, personalized, and branded, delivering a premium hospitality experience automatically.
- **Transactional Consistency:** Ensure that every event-triggered message is delivered reliably and contains accurate, property-specific information.
