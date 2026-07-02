import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkOutGuest } from '../booking'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('../audit', () => ({
  logAction: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockReturnValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id', user_metadata: { role: 'staff' } } } })
    }
  })
}));

const { mockFrom } = vi.hoisted(() => {
  return { mockFrom: vi.fn() };
});

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: vi.fn().mockReturnValue({
    from: mockFrom
  })
}));

describe('checkOutGuest (Zero-Balance Blockade)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should FAIL to checkout if the guest owes money (Balance > 0)', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'bookings') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { amount: 100 }, error: null })
          })
        };
      } else if (table === 'incidental_charges') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [{ amount: 20 }], error: null })
        };
      } else if (table === 'payments') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [{ amount: 70 }], error: null })
        };
      }
    });

    const result = await checkOutGuest('booking-123', 'room-123');
    
    expect(result.error).toBeDefined();
    expect(result.error).toContain('Folio has a non-zero balance');
    expect(result.success).toBeUndefined();
  });

  it('should SUCCEED in checking out if the balance is exactly 0.00', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'bookings') {
        return {
          select: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { amount: 100 }, error: null })
          })
        };
      } else if (table === 'rooms') {
        return {
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
        };
      } else if (table === 'incidental_charges') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [{ amount: 0 }], error: null })
        };
      } else if (table === 'payments') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [{ amount: 100 }], error: null })
        };
      }
    });

    const result = await checkOutGuest('booking-456', 'room-456');
    
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should SUCCEED in checking out if the guest has overpaid (Balance < 0)', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'bookings') {
        return {
          select: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { amount: 100 }, error: null })
          })
        };
      } else if (table === 'rooms') {
        return {
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
        };
      } else if (table === 'incidental_charges') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [{ amount: 0 }], error: null })
        };
      } else if (table === 'payments') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [{ amount: 120 }], error: null })
        };
      }
    });

    const result = await checkOutGuest('booking-789', 'room-789');
    
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });
})
