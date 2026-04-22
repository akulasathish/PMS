import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createRoomBlock, resolveRoomBlock } from '../inventory'

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

  it('should FAIL to block a room if it is currently Occupied', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'rooms') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { status: 'Occupied', room_number: '101' }, error: null })
          })
        };
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn() };
    });

    const formData = new FormData();
    formData.append('roomId', 'room-101');
    formData.append('propertyId', 'prop-123');
    formData.append('type', 'OOO');
    formData.append('startDate', '2026-04-22');
    formData.append('endDate', '2026-04-25');
    formData.append('reason', 'Broken AC');

    const result = await createRoomBlock(formData);
    expect(result.error).toContain('Occupied');
  });

  it('should SUCCEED in resolving a block', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'room_blocks') {
        return {
          select: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { room_id: 'room-123', property_id: 'prop-123' }, error: null }),
            error: null
          })
        };
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn(), update: vi.fn().mockReturnThis() };
    });

    const result = await resolveRoomBlock('block-123');
    expect(result.success).toBe(true);
  });
})
