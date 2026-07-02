import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkOutGuest, createBooking } from '../booking'

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
});

describe('createBooking (Prepaid/Advance Support)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create booking and insert prepaid payment with the correct business date if provided', async () => {
    const mockInsert = vi.fn().mockImplementation((data) => {
      return {
        select: vi.fn().mockResolvedValue({ data: data.map((d, index) => ({ id: `booking-id-${index}`, ...d })), error: null })
      };
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'rooms') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { room_number: '101', sharing_capacity: 2, allowed_billing_type: 'daily' }, error: null })
        };
      } else if (table === 'room_blocks') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          gte: vi.fn().mockResolvedValue({ data: [], error: null })
        };
      } else if (table === 'bookings') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({ data: [], error: null })
          }),
          insert: mockInsert
        };
      } else if (table === 'payments') {
        return {
          insert: vi.fn().mockResolvedValue({ error: null })
        };
      }
    });

    const formData = new FormData();
    formData.append('propertyId', 'property-123');
    formData.append('roomIds', 'room-101');
    formData.append('guestName', 'Jane Doe');
    formData.append('guestPhone', '+91 99999 88888');
    formData.append('checkIn', '2026-07-02');
    formData.append('checkOut', '2026-07-05');
    formData.append('amount', '3000');
    formData.append('prepaidAmount', '1000');
    formData.append('prepaidMethod', 'UPI');
    formData.append('prepaidDate', '2026-06-22'); // 10 days back!

    const result = await createBooking(formData);

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
    expect(mockFrom).toHaveBeenCalledWith('payments');
  });
});

