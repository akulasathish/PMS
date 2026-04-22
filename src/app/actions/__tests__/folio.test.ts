import { describe, it, expect, vi, beforeEach } from 'vitest'
import { postIncidentalCharge, postPayment } from '../folio'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('../audit', () => ({
  logAction: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockReturnValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } } })
    }
  })
}));

const { mockInsert } = vi.hoisted(() => {
  return {
    mockInsert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'mock-id' }, error: null })
      })
    })
  }
})

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      insert: mockInsert
    })
  })
}));

describe('Folio Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('postIncidentalCharge', () => {
    it('should return success and a chargeId when a valid charge is posted', async () => {
      const formData = new FormData();
      formData.append('bookingId', '12345-abc');
      formData.append('propertyId', 'property-123');
      formData.append('amount', '15.50');
      formData.append('description', 'Minibar - Coke');

      const result = await postIncidentalCharge(formData);
      
      expect(result.success).toBe(true);
      expect(result.chargeId).toBe('mock-id');
      expect(mockInsert).toHaveBeenCalledOnce();
    });

    it('should return an error if the amount is missing or invalid', async () => {
      const formData = new FormData();
      formData.append('bookingId', '12345-abc');
      formData.append('propertyId', 'property-123');
      formData.append('description', 'Missing Amount Test');

      const result = await postIncidentalCharge(formData);
      
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Missing required fields');
      expect(mockInsert).not.toHaveBeenCalled();
    });
  });

  describe('postPayment', () => {
    it('should return success and a paymentId when a valid payment is logged', async () => {
      const formData = new FormData();
      formData.append('bookingId', '12345-abc');
      formData.append('propertyId', 'property-123');
      formData.append('amount', '100.00');
      formData.append('method', 'UPI');
      formData.append('transactionId', 'txn_09876');

      const result = await postPayment(formData);
      
      expect(result.success).toBe(true);
      expect(result.paymentId).toBe('mock-id');
      expect(mockInsert).toHaveBeenCalledOnce();
    });

    it('should return an error if required payment fields are missing', async () => {
      const formData = new FormData();
      formData.append('bookingId', '12345-abc');
      // Intentionally missing amount and method

      const result = await postPayment(formData);
      
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Missing required fields');
      expect(mockInsert).not.toHaveBeenCalled();
    });
  });
})
