export interface QuickLedgerItem {
  id?: string;
  amount: number;
  description: string;
  category: string;
}

const FOOD_AND_EXPENSE_WORDS = new Set([
  'curd', 'milk', 'rice', 'oil', 'vegitbale', 'vegitbales', 'vegetable', 'vegetables',
  'chicken', 'egg', 'eggs', 'tea', 'coffee', 'sugar', 'gas', 'cylinder', 'tanker', 'water',
  'diesel', 'petrol', 'salary', 'acid', 'broom', 'mop', 'soap', 'salt', 'chilli', 'masala',
  'paneer', 'dal', 'dall', 'atta', 'flour', 'wheat', 'onion', 'onions', 'potato', 'potatoes',
  'tomato', 'tomatoes', 'trader', 'traders', 'rythu', 'bidda', 'kirana', 'grocer', 'groceries',
  'mess', 'food', 'breakfast', 'lunch', 'dinner', 'plumber', 'repair', 'electrician', 'cleaning'
]);

export function categorizeExpense(description: string): string {
  const lower = description.toLowerCase();
  if (/(?:rice|oil|vegitbale|vegetable|chicken|grocer|kirana|trader|milk|gas|cylinder|mess|food|breakfast|lunch|dinner|egg|tea|coffee|curd|tomato|onion|dall|dal|paneer|atta|flour|wheat|potato|sugar|salt|chilli|masala)/i.test(lower)) {
    return 'Food';
  }
  if (/(?:water|tanker|electricity|current|power|bill|eb|wifi|internet|recharge|diesel|petrol)/i.test(lower)) {
    return 'Utilities';
  }
  if (/(?:salary|cleaner|cook|helper|security|manager|sweep|maid|payroll|staff)/i.test(lower)) {
    return 'Staff';
  }
  if (/(?:plumber|plumbing|pipe|tap|repair|carpenter|paint|bulb|light|fan|switch|ac|drain|hardware|maintenance|electrician)/i.test(lower)) {
    return 'Maintenance';
  }
  if (/(?:laundry|washing|detergent|soap|acid|cleaning|broom|mop)/i.test(lower)) {
    return 'Laundry';
  }
  return 'Others';
}

export function levenshteinDistance(a: string, b: string): number {
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
    }
  }
  return d[m][n];
}

const NAME_MATCH_NOISE = new Set([
  'please', 'tenant', 'resident', 'guest', 'called', 'named', 'name',
  'mr', 'mrs', 'ms', 'shri', 'from', 'in', 'room', 'rm', 'rom', 'romm', 'to', 'bed',
  'the', 'of', 'for', 'is', 'a', 'an', 'and', '&',
  'maintainance', 'maintenance', 'maintance', 'maintence', 'maintanace', 'maintanance', 'maintanence', 'maint',
  'refundable', 'refundabale', 'refundble'
]);

export function isResidentNameMatch(guestName?: string | null, queryName?: string | null): boolean {
  if (!guestName || !queryName) return false;

  const cleanTokens = (str: string) =>
    str
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w && !NAME_MATCH_NOISE.has(w) && !w.startsWith('maint') && !w.startsWith('ment') && !w.startsWith('refun') && !/^\d+$/.test(w));

  const gTokens = cleanTokens(guestName);
  const qTokens = cleanTokens(queryName);

  if (gTokens.length === 0 || qTokens.length === 0) return false;

  const gClean = gTokens.join(' ');
  const qClean = qTokens.join(' ');

  // 1. Exact or substring match on cleaned string
  if (gClean === qClean || gClean.includes(qClean) || qClean.includes(gClean)) {
    return true;
  }

  // 2. Token-level matching (prefix and typo tolerance)
  for (const q of qTokens) {
    for (const g of gTokens) {
      if (q === g) return true;
      if (q.length >= 4 && g.length >= 4) {
        // e.g. "srikant" vs "srikanth"
        if (q.startsWith(g) || g.startsWith(q)) return true;
        // Levenshtein distance <= 1 for 5+ char tokens (e.g. srikant / srikanth / shrikanth)
        if (levenshteinDistance(q, g) <= 1) return true;
        // Levenshtein distance <= 2 for 8+ char tokens
        if (Math.min(q.length, g.length) >= 8 && levenshteinDistance(q, g) <= 2) return true;
      }
    }
  }

  return false;
}

export function parseQuickLedgerText(input: string) {
  const text = (input || '').trim();
  const lower = text.toLowerCase();

  // Date extraction: 'on 1st', 'on 1st october', 'joined on 1st october', 'paid 1st october', 'date 1st', '1st october 2026'
  const months: Record<string, number> = {
    jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
    apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7,
    aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10,
    nov: 11, november: 11, dec: 12, december: 12
  };

  let customDate: string | null = null;
  let customDay: number | null = null;
  let dateRawStr = '';

  const slashDateMatch = lower.match(/\b(?:(?:joined|paid|date|join)\s+)?(?:on\s+)?(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/i);
  const dateMatch = lower.match(/\b(?:(?:joined|paid|date|join)\s+)?(?:on\s+)?(\d{1,2})(?:st|nd|rd|th)?\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember))(?:\s+(20\d{2}))?\b/i) ||
                    lower.match(/(?:(?:joined|paid|date|join)\s+)?on\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s+([a-z]+))?/i) ||
                    lower.match(/\bdate\s+(\d{1,2})(?:st|nd|rd|th)?\b/i);

  if (slashDateMatch) {
    const day = parseInt(slashDateMatch[1], 10);
    const month = parseInt(slashDateMatch[2], 10);
    let year = parseInt(slashDateMatch[3], 10);
    if (year < 100) year += 2000;
    customDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    customDay = day;
    dateRawStr = slashDateMatch[0];
  } else if (dateMatch) {
    const day = parseInt(dateMatch[1], 10);
    const now = new Date();
    let year = now.getFullYear();
    if (dateMatch[3] && dateMatch[3].length === 4) {
      year = parseInt(dateMatch[3], 10);
    }
    let month = now.getMonth() + 1;
    if (dateMatch[2] && months[dateMatch[2].toLowerCase()]) {
      month = months[dateMatch[2].toLowerCase()];
    }
    customDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    customDay = day;
    dateRawStr = dateMatch[0];
  }

  // 0a. PENDING DUES REPORT CHECK
  const isDuesReport = /(?:^|\b)(?:(?:report\s+of\s+)?pending\s+dues|pending\s+due|dues\s+report|due\s+report|pending\s+rent|pending\s+list|who\s+has\s+dues|who\s+has\s+pending\s+dues|dues\s+list|show\s+dues|show\s+pending\s+dues|check\s+dues|list\s+dues)(?:\b|$)/i.test(lower);
  if (isDuesReport) {
    return {
      type: 'dues_report' as const
    };
  }

  // 0b. TODAY LEDGER SUMMARY / HISTORY CHECK
  const isTodaySummary = /(?:^|\b)(?:today\s*(?:summary|history|report|ledger|entries|log)|what\s*(?:did\s*i|was)\s*log(?:ged)?\s*today|chat\s*history|history)(?:\b|$)/i.test(lower);
  if (isTodaySummary) {
    return {
      type: 'today_summary' as const
    };
  }

  // 0c-1. CHECKOUT / VACATE TENANT CHECK
  const isCheckout = /\b(?:checkout|check\s*out|vacate)\b/i.test(lower);
  if (isCheckout) {
    const isForce = /\b(?:force|forced)\b/i.test(lower);
    let cleaned = lower;

    // Room number
    let roomNumber: string | null = null;
    const explicitRoom = cleaned.match(/\b(?:room|rom|romm|rm|r)\s*#?\s*(\d{1,4})\b/i);
    if (explicitRoom) {
      roomNumber = explicitRoom[1];
      cleaned = cleaned.replace(explicitRoom[0], ' ');
    } else {
      const standaloneRoom = cleaned.match(/\b([1-9]\d{2})\b/);
      if (standaloneRoom) {
        roomNumber = standaloneRoom[1];
        cleaned = cleaned.replace(standaloneRoom[0], ' ');
      }
    }

    const noiseWords = new Set([
      'please', 'checkout', 'check', 'out', 'guest', 'tenant', 'resident',
      'from', 'in', 'room', 'rm', 'rom', 'romm', 'force', 'forced', 'vacate', 'now', 'to', 'bed',
      'name', 'called', 'named', 'the', 'a', 'an', 'for', 'of', 'person', 'guy', 'tenant'
    ]);
    const nameTokens = cleaned.split(/\s+/).filter(w => w && !noiseWords.has(w) && !/^\d+$/.test(w));
    const tenantName = nameTokens.join(' ').trim() || undefined;

    return {
      type: 'checkout' as const,
      roomNumber: roomNumber || undefined,
      tenantName,
      isForce
    };
  }

  // 0c. UPDATE TENANT / CHANGE DATES OR RENT CHECK
  const isUpdateTenant = /\b(?:change|update|set|modify|edit|correct)\b/i.test(lower) &&
                         /\b(?:joining|joined|join|due|cycle|rent|fee|date|day|tenant|resident|maintainance|maintenance|maintance|maintence|refundable|deposit|adv)\b/i.test(lower);
  if (isUpdateTenant) {
    let cleaned = lower;

    // 1. Room Number: explicit 'room 201' / 'rm 201' or standalone 3-digit
    let roomNumber: string | null = null;
    const explicitRoom = cleaned.match(/\b(?:room|rom|romm|rm|r)\s*#?\s*(\d{1,4})\b/i);
    if (explicitRoom) {
      roomNumber = explicitRoom[1];
      cleaned = cleaned.replace(explicitRoom[0], ' ');
    } else {
      const standaloneRoom = cleaned.match(/\b([1-9]\d{2})\b/);
      if (standaloneRoom) {
        roomNumber = standaloneRoom[1];
        cleaned = cleaned.replace(standaloneRoom[0], ' ');
      }
    }

    // 2. Joining Date: e.g. 'joining date 1st may 2026', 'joining date to 1st october', '10/05/2026'
    let newCheckInDate: string | null = null;
    const joinMatch = cleaned.match(/\b(?:joining\s*date|joining|checkin|join)\s*(?:is|to|on)?\s*(\d{1,2})(?:st|nd|rd|th)?\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember))(?:\s+(20\d{2}))?\b/i) ||
                      cleaned.match(/\b(?:joining\s*date|joining|checkin|join)\s*(?:is|to|on)?\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/i) ||
                      cleaned.match(/\b(?:joining\s*date|checkin)\s*(?:is|to|on)?\s*(\d{1,2})(?:st|nd|rd|th)?\b/i);
    if (joinMatch) {
      if (joinMatch[2] && months[joinMatch[2].toLowerCase()]) {
        const day = parseInt(joinMatch[1], 10);
        const month = months[joinMatch[2].toLowerCase()];
        const year = joinMatch[3] ? parseInt(joinMatch[3], 10) : new Date().getFullYear();
        newCheckInDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      } else if (joinMatch[1] && joinMatch[2] && joinMatch[3]) {
        const day = parseInt(joinMatch[1], 10);
        const month = parseInt(joinMatch[2], 10);
        let year = parseInt(joinMatch[3], 10);
        if (year < 100) year += 2000;
        newCheckInDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      } else if (joinMatch[1]) {
        const day = parseInt(joinMatch[1], 10);
        const now = new Date();
        newCheckInDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
      cleaned = cleaned.replace(joinMatch[0], ' ');
    } else {
      const isJoinKeyword = /\b(?:joining|joined|join|checkin|check\s*in)\b/i.test(cleaned);
      if (isJoinKeyword) {
        const dateMatch = cleaned.match(/\b(?:to|on|as|is)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s+([a-z]+))?\b/i) ||
                          cleaned.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember))\b/i) ||
                          cleaned.match(/\b(\d{1,2})(?:st|nd|rd|th)?\b/);
        if (dateMatch && dateMatch[1]) {
          const day = parseInt(dateMatch[1], 10);
          const now = new Date();
          let year = now.getFullYear();
          let month = now.getMonth() + 1;
          if (dateMatch[2] && months[dateMatch[2].toLowerCase()]) {
            month = months[dateMatch[2].toLowerCase()];
          }
          newCheckInDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          cleaned = cleaned.replace(dateMatch[0], ' ');
        }
      }
    }

    // 3. Due Day: 'due date to 10th', 'due to 10th', 'due 10', 'due date 1st'
    let newDueDay: number | null = null;
    const dueMatch = cleaned.match(/\b(?:due\s*(?:date|day|dat)?|cycle)\b[^\d]*?(\d{1,2})(?:st|nd|rd|th)?\b/i);
    if (dueMatch) {
      newDueDay = parseInt(dueMatch[1], 10);
      cleaned = cleaned.replace(dueMatch[0], ' ');
    }

    // 4. New Monthly Rent / Fee: 'rent 8500', 'fee 8500', 'rent to 8500', 'romm fee paid 9000'
    let newMonthlyRent: number | null = null;
    const rentPaidExplicitInRent = cleaned.match(/\b(?:room|rom|romm|rm)?\s*(?:fee|rent|feee)\s*(?:is\s*)?(?:paid|sent)\s*[:=]?\s*(\d+(?:\.\d+)?)(k)?\b/i);
    if (rentPaidExplicitInRent) {
      newMonthlyRent = parseFloat(rentPaidExplicitInRent[1]) * (rentPaidExplicitInRent[2] ? 1000 : 1);
      cleaned = cleaned.replace(rentPaidExplicitInRent[0], ' ');
    } else {
      const rentMatch = cleaned.match(/\b(?:rent|monthly\s*rent|room\s*fee|rom\s*fee|romm\s*fee|fee|monthly)\b[^\d]*?(\d+(?:\.\d+)?)(k)?\b/i);
      if (rentMatch) {
        newMonthlyRent = parseFloat(rentMatch[1]) * (rentMatch[2] ? 1000 : 1);
        cleaned = cleaned.replace(rentMatch[0], ' ');
      } else {
        const rentBefore = cleaned.match(/(\d+(?:\.\d+)?)(k)?\s*(?:rent|room\s*fee|rom\s*fee|romm\s*fee|fee)\b/i);
        if (rentBefore) {
          newMonthlyRent = parseFloat(rentBefore[1]) * (rentBefore[2] ? 1000 : 1);
          cleaned = cleaned.replace(rentBefore[0], ' ');
        }
      }
    }

    // 5. Maintenance Fee: 'maintainance 1000', '1000 maintainance'
    let newMaintenanceFee: number | null = null;
    const maintMatch = cleaned.match(/\b(?:maint[a-z]*|ment[a-z]*|non\s*refundable)\s*[:=]?\s*(\d+(?:\.\d+)?)(k)?\b/i) ||
                       cleaned.match(/(\d+(?:\.\d+)?)(k)?\s*(?:maint[a-z]*|ment[a-z]*|non\s*refundable)\b/i);
    if (maintMatch) {
      newMaintenanceFee = parseFloat(maintMatch[1]) * (maintMatch[2] ? 1000 : 1);
      cleaned = cleaned.replace(maintMatch[0], ' ');
    }

    // 6. Refundable Deposit: 'refundabale 1000', '1000 refundable'
    let newRefundableDeposit: number | null = null;
    const refMatch = cleaned.match(/\b(?:refun[a-z]*\s*(?:ammount|amount|deposit|fee)?|security\s*deposit|sec\s*deposit|deposit|adv|advance|advan[cv]e)\s*[:=]?\s*(\d+(?:\.\d+)?)(k)?\b/i) ||
                     cleaned.match(/(\d+(?:\.\d+)?)(k)?\s*(?:refun[a-z]*\s*(?:ammount|amount|deposit|fee)?|security\s*deposit|sec\s*deposit|deposit|adv|advance|advan[cv]e)\b/i);
    if (refMatch) {
      newRefundableDeposit = parseFloat(refMatch[1]) * (refMatch[2] ? 1000 : 1);
      cleaned = cleaned.replace(refMatch[0], ' ');
    }

    // 7. Payment intention
    const isPaid = /\b(?:paid|sent)\b/i.test(lower);

    // 8. Tenant Name from remaining tokens
    const noiseWords = new Set([
      'please', 'existing', 'modify', 'change', 'update', 'set', 'edit', 'correct',
      'tenant', 'resident', 'guest', 'room', 'rm', 'rom', 'romm', 'rent', 'fee', 'to', 'for', 'of',
      'and', '&', 'is', 'as', 'the', 'in', 'on', 'bed', 'paid', 'sent',
      'name', 'called', 'named', 'person',
      'maintainance', 'maintenance', 'maintance', 'maintence', 'maintanace', 'maintanance', 'maintanence', 'maint',
      'refundable', 'refundabale', 'refundble', 'deposit', 'ammount', 'amount',
      'adv', 'advance', 'due', 'date', 'day', 'joining', 'joined', 'join', 'non',
      'january', 'jan', 'february', 'feb', 'march', 'mar', 'april', 'apr', 'may', 'june', 'jun',
      'july', 'jul', 'august', 'aug', 'september', 'sep', 'october', 'oct', 'november', 'nov', 'december', 'dec'
    ]);
    const nameTokens = cleaned.split(/\s+/).filter(w =>
      w &&
      !noiseWords.has(w) &&
      !w.startsWith('maint') &&
      !w.startsWith('ment') &&
      !w.startsWith('refun') &&
      !/^\d+(?:st|nd|rd|th)?$/i.test(w)
    );
    const tenantName = nameTokens.join(' ').trim() || undefined;

    return {
      type: 'update_tenant' as const,
      roomNumber: roomNumber || undefined,
      tenantName,
      newCheckInDate: newCheckInDate || undefined,
      newDueDay: newDueDay || undefined,
      newMonthlyRent: newMonthlyRent || undefined,
      newMaintenanceFee: newMaintenanceFee !== null ? newMaintenanceFee : undefined,
      newRefundableDeposit: newRefundableDeposit !== null ? newRefundableDeposit : undefined,
      isPaid
    };
  }

  // 0d. ASSIGN / NEW TENANT CHECK
  const isAssign = /\b(?:assign|new\s+tenant|add\s+tenant|join\s+tenant|joining|joined|guest|daily|daily\s*basis)\b/i.test(lower) ||
                   (/\b(?:add|guest)\b/i.test(lower) && (/\b(?:room|rom|romm|rm|r)\b/i.test(lower) || /\bto\b/i.test(lower) || /\b\d{3}\b/.test(lower) || /\bshare\b/i.test(lower) || /\bdays?\b/i.test(lower))) ||
                   /\b(?:maintainance|maintenance|maintance|maintence|maintanace|maintanance|maintanence|refundable)\b/i.test(lower);
  if (isAssign) {
    let cleaned = lower;
    if (dateRawStr) {
      cleaned = cleaned.replace(dateRawStr, ' ');
    }
    cleaned = cleaned.replace(/[\\/]/g, ' ');

    // 0. Daily Basis Stay Check (Short stays: e.g. "per day 600 total 2 days paid 600", "daily basis", "3 days")
    const isDaily = /\b(?:daily|daily\s*basis|per\s*day|\bdays\b)\b/i.test(cleaned);
    if (isDaily) {
      // 1. Pending mention (e.g. "pedning 600", "pending 600", "balance 600")
      const pendMatch = cleaned.match(/\b(?:pending|pedning|bal|balance)\s*[:=]?\s*(\d+(?:\.\d+)?)(k)?\b/i);
      if (pendMatch) {
        cleaned = cleaned.replace(pendMatch[0], ' ');
      }

      // 2. Stay Days (e.g. "total 2 days", "2 days", "for 3 days")
      let stayDays = 1;
      const daysMatch = cleaned.match(/\b(?:total\s*)?(\d{1,2})\s*days?\b/i) || cleaned.match(/\bfor\s*(\d{1,2})\s*days?\b/i);
      if (daysMatch) {
        stayDays = parseInt(daysMatch[1], 10);
        cleaned = cleaned.replace(daysMatch[0], ' ');
      }

      // 3. Per Day Rate (e.g. "per day 600", "600 per day", "day 600")
      let perDayRate = 0;
      const perDayMatch = cleaned.match(/\b(?:per\s*day|day\s*rate|rate\s*per\s*day|day\s*fee)\s*[:=]?\s*(\d+(?:\.\d+)?)(k)?\b/i) ||
                          cleaned.match(/(\d+(?:\.\d+)?)(k)?\s*(?:per\s*day|\/\s*day)\b/i);
      if (perDayMatch) {
        perDayRate = parseFloat(perDayMatch[1]) * (perDayMatch[2] ? 1000 : 1);
        cleaned = cleaned.replace(perDayMatch[0], ' ');
      }

      // 4. Paid Amount (e.g. "paid only for 1 day 600", "paid 600", "600 paid")
      let paidAmount = 0;
      const paidMatch = cleaned.match(/\b(?:paid|sent|given)\s*(?:only\s*)?(?:for\s*\d+\s*days?)?\s*[:=]?\s*(\d+(?:\.\d+)?)(k)?\b/i) ||
                        cleaned.match(/(\d+(?:\.\d+)?)(k)?\s*(?:paid|sent)\b/i);
      if (paidMatch) {
        paidAmount = parseFloat(paidMatch[1]) * (paidMatch[2] ? 1000 : 1);
        cleaned = cleaned.replace(paidMatch[0], ' ');
      }

      // 5. Total Tariff
      let totalTariff = perDayRate > 0 ? (perDayRate * stayDays) : 0;
      const totalMatch = cleaned.match(/\b(?:total|tariff|amount)\s*[:=]?\s*(\d+(?:\.\d+)?)(k)?\b/i);
      if (totalMatch) {
        totalTariff = parseFloat(totalMatch[1]) * (totalMatch[2] ? 1000 : 1);
        cleaned = cleaned.replace(totalMatch[0], ' ');
      } else if (totalTariff === 0 && paidAmount > 0) {
        totalTariff = paidAmount;
      }

      if (perDayRate === 0 && stayDays > 0 && totalTariff > 0) {
        perDayRate = totalTariff / stayDays;
      }

      // 6. Explicit Room: 'room 204' or standalone 3-digit
      let roomNumber: string | null = null;
      const explicitRoom = cleaned.match(/\b(?:room|rom|romm|rm|r)\s*#?\s*(\d{1,4})\b/i);
      if (explicitRoom) {
        roomNumber = explicitRoom[1];
        cleaned = cleaned.replace(explicitRoom[0], ' ');
      } else {
        const standaloneRoom = cleaned.match(/\b([1-9]\d{2})\b/);
        if (standaloneRoom) {
          roomNumber = standaloneRoom[1];
          cleaned = cleaned.replace(standaloneRoom[0], ' ');
        }
      }

      // 7. Tenant Name from remaining tokens
      const noiseWords = new Set([
        'assign', 'new', 'tenant', 'guest', 'add', 'joined', 'joining', 'join', 'to', 'in', 'room', 'rm', 'rom', 'romm',
        'daily', 'basis', 'per', 'day', 'days', 'total', 'paid', 'sent', 'only', 'for', 'pending', 'pedning',
        'bal', 'balance', 'fee', 'rent', 'and', '&', 'at'
      ]);
      const nameTokens = cleaned.split(/\s+/).filter(w => w && !noiseWords.has(w) && !/^\d+$/.test(w) && !/^[^\w]+$/.test(w));
      const tenantName = nameTokens.join(' ').replace(/[^\w\s]/g, '').trim();

      return {
        type: 'assign' as const,
        tenantName,
        roomNumber,
        isDaily: true,
        stayDays,
        perDayRate,
        totalAmount: totalTariff,
        paidAmount,
        monthlyRent: 0,
        advAmount: 0,
        refundableDeposit: 0,
        maintenanceFee: 0,
        sharing: null,
        checkInDate: customDate,
        dueDay: null
      };
    }

    // 1. Sharing: '3 share', '2 sharing', 'single'
    let sharing: number | null = null;
    const shareMatch = cleaned.match(/\b([1-6])\s*(?:share|sharing|bed)\b/i);
    if (shareMatch) {
      sharing = parseInt(shareMatch[1], 10);
      cleaned = cleaned.replace(shareMatch[0], ' ');
    } else if (/\bsingle\s*(?:share|room|bed)?\b/i.test(cleaned)) {
      sharing = 1;
      cleaned = cleaned.replace(/\bsingle\s*(?:share|room|bed)?\b/gi, ' ');
    }

    // 2. Room Number: explicit 'room 201' / 'rm 201' or standalone 3-digit
    let roomNumber: string | null = null;
    const explicitRoom = cleaned.match(/\b(?:room|rom|romm|rm|r)\s*#?\s*(\d{1,4})\b/i);
    if (explicitRoom) {
      roomNumber = explicitRoom[1];
      cleaned = cleaned.replace(explicitRoom[0], ' ');
    } else {
      const standaloneRoom = cleaned.match(/\b([1-9]\d{2})\b/);
      if (standaloneRoom) {
        roomNumber = standaloneRoom[1];
        cleaned = cleaned.replace(standaloneRoom[0], ' ');
      }
    }

    // 3. Due Day: 'due 28' or 'due day 28' or 'due date is 1st'
    let dueDay: number | null = null;
    const dueMatch = cleaned.match(/\b(?:due\s*(?:dat|date)?|cycle|due\s*day)\s*(?:is|to|on)?\s*[:=]?\s*(\d{1,2})(?:st|nd|rd|th)?\b/i) ||
                     cleaned.match(/\b(?:due|cycle|due\s*day|day)\s*[:=]?\s*(\d{1,2})(?:st|nd|rd|th)?\b/i);
    if (dueMatch) {
      dueDay = parseInt(dueMatch[1], 10);
      cleaned = cleaned.replace(dueMatch[0], ' ');
    } else if (customDay) {
      dueDay = customDay;
    }

    // 4. Monthly Rent / Room Fee (check paid variations first, then standard prefix/suffix)
    let monthlyRent = 0;
    let rentPaid = 0;

    const rentPaidPattern1 = cleaned.match(/\b(?:room|rom|romm|rm)?\s*(?:fee|rent|feee)\s*(?:is\s*)?(?:paid|sent)\s*[:=]?\s*(\d+(?:\.\d+)?)(k)?\b/i);
    const rentPaidPattern2 = cleaned.match(/\b(?:paid|sent)\s*[:=]?\s*(?:room|rom|romm|rm)?\s*(?:fee|rent|feee)\s*[:=]?\s*(\d+(?:\.\d+)?)(k)?\b/i);
    const rentPaidPattern3 = cleaned.match(/\b(?:paid|sent)\s*[:=]?\s*(\d+(?:\.\d+)?)(k)?\s*(?:room|rom|romm|rm)?\s*(?:fee|rent|feee)\b/i);
    const rentPaidPattern4 = cleaned.match(/(\d+(?:\.\d+)?)(k)?\s*(?:room|rom|romm|rm)?\s*(?:fee|rent|feee)\s*(?:is\s*)?(?:paid|sent)\b/i);

    if (rentPaidPattern1) {
      const amt = parseFloat(rentPaidPattern1[1]) * (rentPaidPattern1[2] ? 1000 : 1);
      monthlyRent = amt;
      rentPaid = amt;
      cleaned = cleaned.replace(rentPaidPattern1[0], ' ');
    } else if (rentPaidPattern2) {
      const amt = parseFloat(rentPaidPattern2[1]) * (rentPaidPattern2[2] ? 1000 : 1);
      monthlyRent = amt;
      rentPaid = amt;
      cleaned = cleaned.replace(rentPaidPattern2[0], ' ');
    } else if (rentPaidPattern3) {
      const amt = parseFloat(rentPaidPattern3[1]) * (rentPaidPattern3[2] ? 1000 : 1);
      monthlyRent = amt;
      rentPaid = amt;
      cleaned = cleaned.replace(rentPaidPattern3[0], ' ');
    } else if (rentPaidPattern4) {
      const amt = parseFloat(rentPaidPattern4[1]) * (rentPaidPattern4[2] ? 1000 : 1);
      monthlyRent = amt;
      rentPaid = amt;
      cleaned = cleaned.replace(rentPaidPattern4[0], ' ');
    } else {
      const rentBefore = cleaned.match(/(\d+(?:\.\d+)?)(k)?\s*(?:rent|monthly|rom\s*fee|room\s*fee|romm\s*fee|fee|feee)\b/i);
      if (rentBefore) {
        monthlyRent = parseFloat(rentBefore[1]) * (rentBefore[2] ? 1000 : 1);
        cleaned = cleaned.replace(rentBefore[0], ' ');
      } else {
        const rentAfter = cleaned.match(/\b(?:rent|monthly|rom\s*fee|room\s*fee|romm\s*fee|room\s*rent|rom\s*rent|romm\s*rent|fee|feee)\s*[:=]?\s*(\d+(?:\.\d+)?)(k)?\b/i);
        if (rentAfter) {
          monthlyRent = parseFloat(rentAfter[1]) * (rentAfter[2] ? 1000 : 1);
          cleaned = cleaned.replace(rentAfter[0], ' ');
        }
      }
    }

    // 5. Maintenance Fee (Non-refundable) (check suffix '1000 maintence' first, then prefix 'maintence 1000')
    let maintenanceFee = 0;
    const maintBefore = cleaned.match(/(\d+(?:\.\d+)?)(k)?\s*(?:maint[a-z]*|ment[a-z]*|non\s*refundable)\b/i);
    if (maintBefore) {
      maintenanceFee = parseFloat(maintBefore[1]) * (maintBefore[2] ? 1000 : 1);
      cleaned = cleaned.replace(maintBefore[0], ' ');
    } else {
      const maintAfter = cleaned.match(/\b(?:maint[a-z]*|ment[a-z]*|non\s*refundable)\s*(?:fee|ammount|amount|charges|charge)?\s*[:=]?\s*(\d+(?:\.\d+)?)(k)?\b/i);
      if (maintAfter) {
        maintenanceFee = parseFloat(maintAfter[1]) * (maintAfter[2] ? 1000 : 1);
        cleaned = cleaned.replace(maintAfter[0], ' ');
      }
    }

    // 6. Refundable Security Deposit / Advance (check suffix '2000 adv' first, then prefix 'adv 2000')
    let refundableDeposit = 0;
    const refBefore = cleaned.match(/(\d+(?:\.\d+)?)(k)?\s*(?:refun[a-z]*\s*(?:ammount|amount|deposit|fee)?|security\s*deposit|sec\s*deposit|deposit|adv|advance|advan[cv]e)\b/i);
    if (refBefore) {
      refundableDeposit = parseFloat(refBefore[1]) * (refBefore[2] ? 1000 : 1);
      cleaned = cleaned.replace(refBefore[0], ' ');
    } else {
      const refAfter = cleaned.match(/\b(?:refun[a-z]*\s*(?:ammount|amount|deposit|fee)?|security\s*deposit|sec\s*deposit|deposit|adv|advance|advan[cv]e)\s*[:=]?\s*(\d+(?:\.\d+)?)(k)?\b/i);
      if (refAfter) {
        refundableDeposit = parseFloat(refAfter[1]) * (refAfter[2] ? 1000 : 1);
        cleaned = cleaned.replace(refAfter[0], ' ');
      }
    }

    // 7. Standalone 3-digit room number (e.g. 201, 302, 101)
    if (!roomNumber) {
      const standaloneRoom = cleaned.match(/\b([1-9]\d{2})\b/);
      if (standaloneRoom) {
        roomNumber = standaloneRoom[1];
        cleaned = cleaned.replace(standaloneRoom[0], ' ');
      }
    }

    // 8. Any remaining numbers (if rent or adv wasn't caught by keyword)
    const remNumbers = cleaned.match(/\b\d+(?:\.\d+)?(?:k)?\b/g);
    if (remNumbers) {
      for (const nStr of remNumbers) {
        const parsedNum = parseFloat(nStr) * (nStr.toLowerCase().includes('k') ? 1000 : 1);
        // Exclude calendar years (2020-2035) so e.g. "2026" never becomes a deposit
        if (parsedNum >= 2020 && parsedNum <= 2035 && !nStr.toLowerCase().includes('k')) {
          continue;
        }
        // Fallback numbers for rent/deposit should be real amounts (> 100)
        if (monthlyRent === 0 && parsedNum > 100) {
          monthlyRent = parsedNum;
        } else if (refundableDeposit === 0 && parsedNum > 100) {
          refundableDeposit = parsedNum;
        }
        cleaned = cleaned.replace(nStr, ' ');
      }
    }

    // 8b. Detect if monthly rent was paid at admission or pending/due
    if (rentPaid === 0) {
      const paidOnlyMatch = lower.match(/\bpaid\s*only\s*(?:for\s*)?(\d+(?:\.\d+)?)(k)?\b/i);
      if (paidOnlyMatch) {
        const onlyAmt = parseFloat(paidOnlyMatch[1]) * (paidOnlyMatch[2] ? 1000 : 1);
        if (onlyAmt > (maintenanceFee + refundableDeposit)) {
          rentPaid = onlyAmt - (maintenanceFee + refundableDeposit);
        } else {
          rentPaid = 0;
        }
      } else {
        const isRentDue = /\b(?:room\s*fee|rom\s*fee|romm\s*fee|rent|fee)\s*(?:is\s*)?(?:due|pending|pedning)\b/i.test(lower) ||
                          /\b(?:due|pending|pedning)\s*(?:room\s*fee|rom\s*fee|romm\s*fee|rent|fee)\b/i.test(lower);
        if (!isRentDue) {
          const rentPaidExplicit = lower.match(/\b(?:paid|sent)\s*[:=]?\s*(\d+(?:\.\d+)?)(k)?\s*(?:rent|room\s*fee|rom\s*fee|romm\s*fee|monthly|fee)\b/i) ||
                                   lower.match(/(\d+(?:\.\d+)?)(k)?\s*(?:rent|room\s*fee|rom\s*fee|romm\s*fee|monthly|fee)\s*(?:is\s*)?(?:paid|sent)\b/i) ||
                                   lower.match(/\b(?:room|rom|romm|rm)?\s*(?:fee|rent|feee)\s*(?:is\s*)?(?:paid|sent)\s*[:=]?\s*(\d+(?:\.\d+)?)(k)?\b/i);
          if (rentPaidExplicit) {
            rentPaid = parseFloat(rentPaidExplicit[1]) * (rentPaidExplicit[2] ? 1000 : 1);
          } else if (/\bpaid\s*(?:rent|room\s*fee|rom\s*fee|romm\s*fee|fee)\b/i.test(lower)) {
            rentPaid = monthlyRent;
          }
        }
      }
    }

    // 9. Clean noise words for Tenant Name
    cleaned = cleaned.replace(/\b(?:assign|new\s+tenant|add\s+tenant|join\s+tenant|joining|joined|add|to|in|tenant\s+name\s+called|tenant\s+called|name\s+called)\b/gi, ' ').trim();
    const noiseWords = new Set([
      'room', 'rom', 'romm', 'rm', 'rent', 'monthly', 'adv', 'advance', 'advanve', 'deposit', 'due', 'day', 'in', 'at', 'fee',
      'feee', 'for', 'to', 'and', '&', 'share', 'sharing', 'bed', 'joined', 'on',
      'maintainance', 'maintenance', 'maintance', 'maintence', 'maintanace', 'maintanance', 'maintanence', 'maint',
      'refundable', 'refundabale', 'refundble', 'ammount', 'amount', 'date', 'paid', 'sent', 'joining', 'join',
      'non', 'today', 'total', 'but', 'only', 'is', 'guest', 'new', 'resident', 'person', 'staying', 'stay',
      'charges', 'charge', 'pedning', 'pending', 'see', 'look', 'name', 'called', 'named', 'please', 'tenant',
      'the', 'a', 'an',
      'january', 'jan', 'february', 'feb', 'march', 'mar', 'april', 'apr', 'may', 'june', 'jun',
      'july', 'jul', 'august', 'aug', 'september', 'sep', 'october', 'oct', 'november', 'nov', 'december', 'dec'
    ]);
    const nameTokens = cleaned.split(/\s+/).filter(w =>
      w &&
      !noiseWords.has(w) &&
      !w.startsWith('maint') &&
      !w.startsWith('ment') &&
      !w.startsWith('refun') &&
      !/^\d+(?:st|nd|rd|th)?$/i.test(w)
    );
    const tenantName = nameTokens.join(' ').trim();

    return {
      type: 'assign' as const,
      tenantName,
      roomNumber,
      monthlyRent,
      rentPaid,
      advAmount: refundableDeposit,
      refundableDeposit,
      maintenanceFee,
      sharing,
      checkInDate: customDate,
      dueDay
    };
  }

  // 1. EXPENSES CHECK (Explicit keywords or known expense item words)
  const isExplicitExpense = /(?:^|\b)(?:expences|expenses|expence|expense|exp)\b/.test(lower);
  const words = lower.split(/[\s,]+/);
  const hasExpenseWord = words.some(w => FOOD_AND_EXPENSE_WORDS.has(w));
  const hasRevenueWord = /\b(?:revenue|rent|rom\s*fee|room\s*fee|romm\s*fee|fee|feee|paid|sent|adv|advance|deposit|due)\b/.test(lower);

  const isExpense = isExplicitExpense || (hasExpenseWord && !hasRevenueWord);

  if (isExpense) {
    const cleaned = lower.replace(/\b(?:expences|expenses|expence|expense|exp)\b/g, ' ').trim();
    const tokens = cleaned.split(/\s+/).filter(Boolean);
    const items: { amount: number; description: string; category: string }[] = [];

    let i = 0;
    while (i < tokens.length) {
      const numMatch = tokens[i].match(/^(\d+(?:\.\d+)?)(k)?$/i);
      if (numMatch) {
        let amt = parseFloat(numMatch[1]);
        if (numMatch[2]) amt *= 1000;
        i++;
        const descWords: string[] = [];
        while (i < tokens.length && !tokens[i].match(/^\d/)) {
          descWords.push(tokens[i]);
          i++;
        }
        const desc = descWords.join(' ') || 'General Expense';
        items.push({
          amount: amt,
          description: desc.charAt(0).toUpperCase() + desc.slice(1),
          category: categorizeExpense(desc)
        });
      } else {
        const descWords: string[] = [];
        while (i < tokens.length && !tokens[i].match(/^\d/)) {
          descWords.push(tokens[i]);
          i++;
        }
        if (i < tokens.length) {
          const numMatch2 = tokens[i].match(/^(\d+(?:\.\d+)?)(k)?$/i);
          if (numMatch2) {
            let amt = parseFloat(numMatch2[1]);
            if (numMatch2[2]) amt *= 1000;
            const desc = descWords.join(' ') || 'General Expense';
            items.push({
              amount: amt,
              description: desc.charAt(0).toUpperCase() + desc.slice(1),
              category: categorizeExpense(desc)
            });
            i++;
          }
        }
      }
    }

    return { type: 'expense' as const, items };
  }

  // 2. REVENUE CHECK
  let cleaned = lower.replace(/\b(?:revenue)\b/g, ' ').trim();
  if (dateRawStr) {
    cleaned = cleaned.replace(dateRawStr, ' ');
  }

  // 1. Advance: 'adv 2000' or '2000 adv'
  let advAmount = 0;
  const advAfter = cleaned.match(/\b(?:adv|advance|deposit)\s*[:=]?\s*(\d+(?:\.\d+)?)(k)?\b/);
  if (advAfter) {
    advAmount = parseFloat(advAfter[1]) * (advAfter[2] ? 1000 : 1);
    cleaned = cleaned.replace(advAfter[0], ' ');
  } else {
    const advBefore = cleaned.match(/(\d+(?:\.\d+)?)(k)?\s*(?:adv|advance|deposit)\b/);
    if (advBefore) {
      advAmount = parseFloat(advBefore[1]) * (advBefore[2] ? 1000 : 1);
      cleaned = cleaned.replace(advBefore[0], ' ');
    }
  }

  // 2. Room Fee / Rent / Paid: 'paid 500' or '500 paid' or 'rent 5000'
  let feeAmount = 0;
  const feeAfter = cleaned.match(/\b(?:paid|sent|fee|feee|rent|rom\s*fee|room\s*fee|romm\s*fee)\s*[:=]?\s*(\d+(?:\.\d+)?)(k)?\b/);
  if (feeAfter) {
    feeAmount = parseFloat(feeAfter[1]) * (feeAfter[2] ? 1000 : 1);
    cleaned = cleaned.replace(feeAfter[0], ' ');
  } else {
    const feeBefore = cleaned.match(/(\d+(?:\.\d+)?)(k)?\s*(?:paid|sent|fee|feee|rent|rom\s*fee|room\s*fee|romm\s*fee)\b/);
    if (feeBefore) {
      feeAmount = parseFloat(feeBefore[1]) * (feeBefore[2] ? 1000 : 1);
      cleaned = cleaned.replace(feeBefore[0], ' ');
    }
  }

  // 3. Explicit room match: 'room 204' or 'rm 204' or 'r 204'
  let roomNumber: string | null = null;
  const explicitRoom = cleaned.match(/\b(?:room|rom|romm|rm|r)\s*#?\s*(\d{1,4})\b/i);
  if (explicitRoom) {
    roomNumber = explicitRoom[1];
    cleaned = cleaned.replace(explicitRoom[0], ' ');
  }

  // 4. Standalone 2-3 digit number (standard room numbers e.g. 101, 204)
  if (!roomNumber) {
    const standaloneRoom = cleaned.match(/\b([1-9]\d{1,2})\b/);
    if (standaloneRoom) {
      roomNumber = standaloneRoom[1];
      cleaned = cleaned.replace(standaloneRoom[0], ' ');
    }
  }

  // 5. Any remaining number
  const remainingNumbers = cleaned.match(/\b\d+(?:\.\d+)?(?:k)?\b/g);
  if (remainingNumbers) {
    for (const nStr of remainingNumbers) {
      const parsed = parseFloat(nStr) * (nStr.includes('k') ? 1000 : 1);
      // Exclude calendar years (2020-2035)
      if (parsed >= 2020 && parsed <= 2035 && !nStr.toLowerCase().includes('k')) {
        continue;
      }
      if (feeAmount === 0) {
        feeAmount = parsed;
      } else if (advAmount === 0 && !lower.includes('due')) {
        advAmount = parsed;
      }
      cleaned = cleaned.replace(nStr, ' ');
    }
  }

  // 6. Name
  const noiseWords = [
    'rom', 'romm', 'room', 'fee', 'rent', 'and', '&', 'paid', 'sent', 'adv', 'advance', 'due', 'for', 'of', 'pg', 'feee',
    'maintainance', 'maintenance', 'maintance', 'maintence', 'maintanace', 'maintanance', 'maintanence', 'maint',
    'refundable', 'refundabale', 'refundble', 'ammount', 'amount',
    'revenue', 'on', 'date', 'joined', 'joining', 'join', 'guest', 'tenant', 'resident', 'name', 'called', 'named', 'please', 'the', 'a', 'an',
    'jan', 'january', 'feb', 'february', 'mar', 'march', 'apr', 'april', 'may', 'jun', 'june',
    'jul', 'july', 'aug', 'august', 'sep', 'september', 'oct', 'october', 'nov', 'november', 'dec', 'december'
  ];
  const nameTokens = cleaned.split(/\s+/).filter(w =>
    w &&
    !noiseWords.includes(w) &&
    !w.startsWith('maint') &&
    !w.startsWith('ment') &&
    !w.startsWith('refun') &&
    !/^\d+(?:st|nd|rd|th)?$/i.test(w)
  );
  const tenantName = nameTokens.join(' ').trim();

  return {
    type: 'revenue' as const,
    roomNumber,
    tenantName,
    feeAmount,
    advAmount,
    totalAmount: feeAmount + advAmount,
    paymentDate: customDate
  };
}
