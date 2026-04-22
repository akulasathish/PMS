import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { RoomBlockModal } from '../RoomBlockModal'

vi.mock('lucide-react', () => ({
  X: () => <span>X</span>,
  AlertTriangle: () => <span>Alert</span>,
  CalendarDays: () => <span>Calendar</span>,
  Wrench: () => <span>Wrench</span>,
  Loader2: () => <span>Loader</span>,
  AlertCircle: () => <span>AlertCircle</span>
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() })
}));

vi.mock('@/app/actions/inventory', () => ({
  createRoomBlock: vi.fn(),
  resolveRoomBlockByRoom: vi.fn()
}));

describe('RoomBlockModal Component', () => {
  it('should render the creation form if room is Available', async () => {
    const { findByText, findByLabelText } = render(
      <RoomBlockModal 
        room={{ id: '1', room_number: '101', status: 'Available', type: 'Standard', property_id: 'prop-1' }}
        onClose={() => {}}
        onSuccess={() => {}}
      />
    );
    
    expect(await findByText('Block Room 101')).toBeDefined();
    expect(await findByText('Start Date')).toBeDefined();
    expect(await findByText('End Date')).toBeDefined();
  });

  it('should render the resolution view if room is already Blocked', async () => {
    const { findByText } = render(
      <RoomBlockModal 
        room={{ id: '2', room_number: '102', status: 'Blocked', type: 'Standard', property_id: 'prop-1' }}
        onClose={() => {}}
        onSuccess={() => {}}
      />
    );
    
    expect(await findByText('Resolve Maintenance Block')).toBeDefined();
    expect(await findByText('Return Room to Service')).toBeDefined();
  });
})
