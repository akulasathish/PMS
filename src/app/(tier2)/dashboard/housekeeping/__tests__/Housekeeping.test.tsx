import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import HousekeepingTerminal from '../page'

vi.mock('lucide-react', () => ({
  Brush: () => <span>Brush</span>,
  Sparkles: () => <span>Sparkles</span>,
  Clock: () => <span>Clock</span>,
  CheckCircle2: () => <span>Check</span>,
  UserCheck: () => <span>UserCheck</span>,
  Loader2: () => <span>Loader</span>,
  Building2: () => <span>Building</span>,
  LayoutDashboard: () => <span>Layout</span>,
  DoorOpen: () => <span>Door</span>,
  Activity: () => <span>Activity</span>,
  Users: () => <span>Users</span>,
  Settings: () => <span>Settings</span>,
  LogOut: () => <span>Logout</span>,
  Wrench: () => <span>Wrench</span>,
  AlertTriangle: () => <span>AlertTriangle</span>,
  Play: () => <span>Play</span>,
  ShieldCheck: () => <span>ShieldCheck</span>
}));

// Mock localStorage to prevent crashes in the component
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(() => 'prop-1'),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
  writable: true,
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() })
}));

vi.mock('@/app/actions/housekeeping', () => ({
  startCleaning: vi.fn(),
  finishCleaning: vi.fn(),
  inspectRoom: vi.fn()
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn().mockReturnValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } } }) },
    from: vi.fn().mockImplementation((table: string) => {
      const builder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis()
      };

      if (table === 'properties') {
        builder.single = vi.fn().mockResolvedValue({ data: { id: 'prop-1', name: 'Test Property' }, error: null });
      } else if (table === 'rooms') {
        builder.or = vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ 
            data: [{ id: 'room-1', room_number: '101', status: 'Blocked', type: 'Standard' }], 
            error: null 
          })
        });
        builder.order = vi.fn().mockResolvedValue({ 
          data: [{ id: 'room-1', room_number: '101', status: 'Blocked', type: 'Standard' }], 
          error: null 
        });
      } else if (table === 'bookings') {
        builder.in = vi.fn().mockResolvedValue({ data: [], error: null });
      } else if (table === 'property_access') {
        builder.single = vi.fn().mockResolvedValue({ data: { property_id: 'prop-1' }, error: null });
      } else if (table === 'room_blocks') {
        builder.eq = vi.fn().mockResolvedValue({ 
          data: [{ room_id: 'room-1', reason: 'Plumbing Issue', end_date: '2026-05-10' }], 
          error: null 
        });
      }
      return builder;
    }),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn()
    }),
    removeChannel: vi.fn()
  })
}));

describe('Housekeeping Terminal UI', () => {
  it.skip('should visually render Blocked rooms with Maintenance status and hide cleaning actions', async () => {
    const { findByText, queryByText } = render(<HousekeepingTerminal />);
    
    expect(await findByText('101')).toBeDefined();
    expect(await findByText('Out of Order / Maintenance')).toBeDefined();
    expect(await findByText('Reason: Plumbing Issue')).toBeDefined();
    expect(queryByText('Start Cleaning')).toBeNull();
  });
})
