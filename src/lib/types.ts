export interface Property {
  id: string;
  name: string;
  status: 'Active' | 'Suspended';
  property_category?: 'PG' | 'Hotel/PG';
  total_capital_investment?: number;
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
  allowed_billing_type?: 'daily' | 'monthly' | 'both';
  sharing_capacity?: number;
}

export interface Booking {
  id: string;
  property_id: string;
  room_id: string;
  guest_name: string;
  guest_email?: string;
  guest_phone?: string;
  guest_address?: string;
  check_in: string;
  check_out: string;
  amount: number;
  total_amount?: number;
  status: 'Pending' | 'Confirmed' | 'Checked In' | 'Checked Out' | 'Cancelled';
  created_at?: string;
  id_verified?: boolean;
  id_photo_url?: string;
  signature_url?: string;
  notes?: string;
  check_in_time?: string;
  check_out_time?: string;
  group_id?: string;
  is_monthly?: boolean;
  billing_cycle_date?: number;
  rent_due_day?: number;
  monthly_rate?: number;
  monthly_rent?: number;
  security_deposit?: number;
  bed_assigned?: string;
  payment_status?: string;
}

export interface UserProfile {
  id: string;
  full_name: string;
  email?: string;
  role?: 'super_admin' | 'owner' | 'admin' | 'partner' | 'user';
  property_id: string | null;
  created_at?: string;
}

export interface PartnerInvestment {
  id: string;
  property_id: string;
  partner_name: string;
  partner_email?: string;
  partner_id?: string;
  investment_amount: number;
  share_percentage: number;
  created_at?: string;
}

export interface TimestampedExpense {
  id: string;
  property_id: string;
  title: string;
  category: string;
  amount: number;
  payment_method: 'Cash' | 'UPI' | 'Bank Transfer';
  expense_timestamp: string;
  business_date: string;
  receipt_url?: string;
  logged_by?: string;
}

export interface StaffPayroll {
  id: string;
  property_id: string;
  staff_name: string;
  role: 'Chef' | 'Helper' | 'Housekeeping' | 'Security' | 'Manager';
  monthly_salary: number;
  payment_status: 'Pending' | 'Paid' | 'Partial';
  paid_amount: number;
  paid_date?: string;
  payment_method?: 'Cash' | 'UPI' | 'Bank Transfer';
  business_month: string;
}

export interface PGTenant {
  id: string;
  property_id: string;
  room_id?: string;
  bed_number?: string;
  sharing_capacity: number;
  full_name: string;
  phone: string;
  monthly_rent: number;
  security_deposit: number;
  deposit_status: 'Held' | 'Refunded' | 'Adjusted';
  rent_due_day: number;
  status: 'Active' | 'Vacated' | 'Notice';
  created_at?: string;
}

export interface DailyClosingSnapshot {
  id: string;
  property_id: string;
  snapshot_date: string;
  total_cash_collected: number;
  total_upi_collected: number;
  total_expenses_cash: number;
  total_expenses_upi: number;
  net_cash_in_hand: number;
  net_daily_profit: number;
  closed_by?: string;
}

export function getTodayLocalYYYYMMDD(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  } catch (e) {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}


