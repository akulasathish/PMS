import { describe, it, expect } from 'vitest'
// This will fail because the template generator doesn't exist yet
import { generateInvoiceHtml } from '../invoice'

describe('Invoice Template Generator', () => {
  it('should calculate 0% GST for rooms under ₹1000', () => {
    const payload = {
      bookingId: "123",
      guestName: "John Doe",
      roomAmount: 999,
      incidentals: [],
      totalPaid: 999
    };
    
    const html = generateInvoiceHtml(payload);
    
    // Expect the HTML to include specific Indian compliance markers
    expect(html).toContain('HSN/SAC: 9963');
    expect(html).toContain('CGST (0%)');
    expect(html).toContain('SGST (0%)');
  });

  it('should calculate 12% GST (6% CGST / 6% SGST) for rooms between ₹1001 and ₹7500', () => {
    const payload = {
      bookingId: "123",
      guestName: "John Doe",
      roomAmount: 3000,
      incidentals: [],
      totalPaid: 3360 // 3000 + 12%
    };
    
    const html = generateInvoiceHtml(payload);
    
    expect(html).toContain('CGST (6%)');
    expect(html).toContain('SGST (6%)');
    expect(html).toContain('₹180.00'); // 6% of 3000
  });

  it('should include incidental charges in the breakdown', () => {
    const payload = {
      bookingId: "123",
      guestName: "John Doe",
      roomAmount: 3000,
      incidentals: [{ description: 'Minibar', amount: 500 }],
      totalPaid: 3860
    };
    
    const html = generateInvoiceHtml(payload);
    expect(html).toContain('Minibar');
    expect(html).toContain('₹500.00');
  });
})
