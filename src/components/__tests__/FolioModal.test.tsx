import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { FolioModal } from '../FolioModal'

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  X: () => <span>X</span>,
  Plus: () => <span>Plus</span>,
  CreditCard: () => <span>Card</span>,
  Banknote: () => <span>Banknote</span>,
  Smartphone: () => <span>Phone</span>,
  Building2: () => <span>Building</span>,
  ArrowRight: () => <span>Arrow</span>,
  ShieldCheck: () => <span>Shield</span>,
  Loader2: () => <span>Loader</span>,
  AlertCircle: () => <span>Alert</span>
}));

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() })
}));

// Mock the server actions
vi.mock('@/app/actions/folio', () => ({
  getFolioSummary: vi.fn().mockResolvedValue({
    success: true,
    data: {
      roomAmount: 100,
      incidentals: [],
      payments: [],
      totalCharges: 100,
      totalPayments: 0,
      balanceDue: 100
    }
  }),
  postIncidentalCharge: vi.fn(),
  postPayment: vi.fn()
}));

vi.mock('@/app/actions/booking', () => ({
  checkOutGuest: vi.fn()
}));

describe('FolioModal Component', () => {
  it('should render the folio layout with Charges and Payments columns after loading', async () => {
    const { findByText } = render(
      <FolioModal 
        bookingId="123"
        propertyId="prop-123"
        guestName="John Doe"
        roomNumber="101"
        baseAmount={100}
        onClose={() => {}}
        onSuccess={() => {}}
      />
    );
    
    // Wait for the component to finish loading and render the main UI
    expect(await findByText('Room Charges')).toBeDefined();
    expect(await findByText('Payments Received')).toBeDefined();
    expect(await findByText('John Doe')).toBeDefined();
  })
})
