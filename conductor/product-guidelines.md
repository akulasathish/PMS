# Product Guidelines - RE-PMS Engine 2026

## Design Aesthetic
- **Accessible Operations:** Utilitarian, accessibility-first design for efficient hotel operations across both roles (Owners and Staff).
- **Minimalist Interaction:** Clean layouts with subtle, high-performance animations (Framer Motion) to enhance the user experience without being distracting.

## Tone & Voice
- **Empathetic & Guiding:** Support hotel operations and staff with a helpful, guiding voice throughout the application.
- **Professionalism:** Maintain a high standard of professional communication, especially in guest-facing automated messaging.

## UX Principles
- **Role Isolation UX:** Ensure strict role-based views with zero "role bleed," keeping the user's interface focused on their specific operational responsibilities (Owner vs. Staff views).
- **Low Latency UI:** Prioritize near-instant updates through Supabase Realtime and efficient n8n relays, ensuring the frontend reflects the system's "database-as-an-event-source" speed.
- **Error Resiliency:** Implement clear, actionable error states, particularly for authentication and access control, to guide users back to safety.

## Automated Guest Communications
- **Premium Hospitality:** Guest-facing emails (Welcome, Smart Check-In, Checkout) must be rich, personalized, and branded, delivering a premium hospitality experience automatically.
- **Transactional Consistency:** Ensure that every event-triggered message is delivered reliably and contains accurate, property-specific information.
