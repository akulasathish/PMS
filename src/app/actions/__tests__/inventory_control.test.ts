import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createRoomBlock, resolveRoomBlockByRoom } from '../inventory'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('../audit', () => ({
  logAction: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockReturnValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-id', user_metadata: { role: 'admin' } } } })
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

describe('Inventory Control (Room Blocking)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should SUCCEED in blocking a currently Occupied room if dates DO NOT overlap', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'rooms') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { room_number: '101' }, error: null })
          }),
          update: vi.fn().mockReturnThis()
        };
      }
      if (table === 'bookings') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          lt: vi.fn().mockReturnThis(),
          gt: vi.fn().mockResolvedValue({ data: [], error: null }) // No overlaps found
        };
      }
      if (table === 'room_blocks') {
        return {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'new-block-id' }, error: null })
        };
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn(), update: vi.fn().mockReturnThis() };
    });

    const formData = new FormData();
    formData.append('roomId', 'room-101');
    formData.append('propertyId', 'prop-123');
    formData.append('type', 'OOO');
    formData.append('startDate', '2026-04-24'); // Guest leaves 23rd, block starts 24th
    formData.append('endDate', '2026-04-26');
    formData.append('reason', 'Broken AC');

    const result = await createRoomBlock(formData);
    
    expect(result.error).toBeUndefined();
    expect(result.success).toBe(true);
  });

  it('should FAIL to block if dates mathematically overlap with a booking', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'bookings') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          lt: vi.fn().mockReturnThis(),
          gt: vi.fn().mockResolvedValue({ data: [{ id: 'booking-id', guest_name: 'John Doe' }], error: null }) // Conflict found
        };
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: {}, error: null }) };
    });

    const formData = new FormData();
    formData.append('roomId', 'room-101');
    formData.append('propertyId', 'prop-123');
    formData.append('type', 'OOO');
    formData.append('startDate', '2026-04-22');
    formData.append('endDate', '2026-04-25');
    formData.append('reason', 'Deep Clean');

    const result = await createRoomBlock(formData);
    
    expect(result.error).toBeDefined();
    expect(result.error).toContain('overlaps');
  });
})
