export interface BillingRule {
  before?: string; // e.g., "10:00:00" (for early checkin)
  after?: string;  // e.g., "13:00:00" (for late checkout)
  charge_type: 'flat' | 'percent';
  value: number;
}

/**
 * Standard default rules used when no custom rules are configured at the property level
 */
export const DEFAULT_EARLY_CHECKIN_RULES: BillingRule[] = [
  { before: "06:00:00", charge_type: "percent", value: 100 }, // Before 6 AM: 100% rate
  { before: "10:00:00", charge_type: "percent", value: 50 },  // 6 AM - 10 AM: 50% rate
  { before: "12:00:00", charge_type: "flat", value: 500 }     // 10 AM - 12 PM: Flat ₹500
];

export const DEFAULT_LATE_CHECKOUT_RULES: BillingRule[] = [
  { after: "18:00:00", charge_type: "percent", value: 100 },  // After 6 PM: 100% rate
  { after: "14:00:00", charge_type: "percent", value: 50 },   // 2 PM - 6 PM: 50% rate
  { after: "12:00:00", charge_type: "flat", value: 500 }      // 12 PM - 2 PM: Flat ₹500
];

/**
 * Calculates the recommended early check-in fee
 */
export function calculateEarlyCheckinFee(
  actualCheckin: Date,
  standardCheckinStr: string = "14:00:00",
  dailyRoomRate: number,
  customRules?: BillingRule[]
): { fee: number; ruleMatched: BillingRule | null } {
  // Convert actual check-in time to "HH:MM:SS" format in local time
  const actualTimeStr = actualCheckin.toTimeString().split(' ')[0];

  // If actual check-in is after standard check-in time, no fee
  if (actualTimeStr >= standardCheckinStr) {
    return { fee: 0, ruleMatched: null };
  }

  const rules = customRules && customRules.length > 0 ? customRules : DEFAULT_EARLY_CHECKIN_RULES;
  
  // Sort rules chronologically (ascending times) to match the earliest tier first
  const sortedRules = [...rules].sort((a, b) => (a.before || "").localeCompare(b.before || ""));

  for (const rule of sortedRules) {
    if (rule.before && actualTimeStr <= rule.before) {
      const fee = rule.charge_type === 'flat' 
        ? rule.value 
        : Math.round((rule.value / 100) * dailyRoomRate * 100) / 100;
      return { fee, ruleMatched: rule };
    }
  }

  return { fee: 0, ruleMatched: null };
}

/**
 * Calculates the recommended late checkout fee
 */
export function calculateLateCheckoutFee(
  actualCheckout: Date,
  standardCheckoutStr: string = "11:00:00",
  dailyRoomRate: number,
  customRules?: BillingRule[]
): { fee: number; ruleMatched: BillingRule | null } {
  // Convert actual checkout time to "HH:MM:SS" format in local time
  const actualTimeStr = actualCheckout.toTimeString().split(' ')[0];

  // If actual checkout is before or at standard checkout time, no fee
  if (actualTimeStr <= standardCheckoutStr) {
    return { fee: 0, ruleMatched: null };
  }

  const rules = customRules && customRules.length > 0 ? customRules : DEFAULT_LATE_CHECKOUT_RULES;
  
  // Sort rules descending by time to find the latest (highest tier) violation matched
  const sortedRules = [...rules].sort((a, b) => (b.after || "").localeCompare(a.after || ""));

  for (const rule of sortedRules) {
    if (rule.after && actualTimeStr >= rule.after) {
      const fee = rule.charge_type === 'flat' 
        ? rule.value 
        : Math.round((rule.value / 100) * dailyRoomRate * 100) / 100;
      return { fee, ruleMatched: rule };
    }
  }

  return { fee: 0, ruleMatched: null };
}
