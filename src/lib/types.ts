export interface Property {
  id: string;
  name: string;
  tier: 'Starter' | 'Pro' | 'Enterprise';
  status: 'Active' | 'Suspended';
  wifi_network?: string;
  wifi_password?: string;
  created_at?: string;
}

export interface Room {
  id: string;
  property_id: string;
  room_number: string;
  type: 'Standard' | 'Deluxe' | 'Suite';
  status: 'Available' | 'Occupied' | 'Dirty' | 'Blocked' | 'Cleaning' | 'Clean';
  created_at?: string;
}

export interface Booking {
  id: string;
  property_id: string;
  room_id: string;
  guest_name: string;
  guest_email?: string;
  guest_address?: string;
  check_in: string;
  check_out: string;
  amount: number;
  status: 'Pending' | 'Confirmed' | 'Checked In' | 'Checked Out' | 'Cancelled';
  created_at?: string;
  id_verified?: boolean;
  id_photo_url?: string;
  signature_url?: string;
  notes?: string;
}

export interface UserProfile {
  id: string;
  full_name: string;
  role: 'admin' | 'owner' | 'front-desk' | 'staff' | 'Guest Journey' | 'Night Auditor' | 'Room Attendant' | 'Supervisor';
  property_id: string | null;
  email?: string;
  permissions?: Record<string, Record<string, string>>;
  created_at?: string;
}
