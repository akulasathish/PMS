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

export function parseQuickLedgerText(input: string) {
  const text = (input || '').trim();
  const lower = text.toLowerCase();

  // Date extraction: 'on 1st', 'on 1st october', 'joined on 1st october', 'paid on 1st', 'on 5th', etc.
  const months: Record<string, number> = {
    jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
    apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7,
    aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10,
    nov: 11, november: 11, dec: 12, december: 12
  };

  let customDate: string | null = null;
  let customDay: number | null = null;
  let dateRawStr = '';

  const dateMatch = lower.match(/(?:(?:joined|paid)\s+)?on\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s+([a-z]+))?/i);
  if (dateMatch) {
    const day = parseInt(dateMatch[1], 10);
    const now = new Date();
    const year = now.getFullYear();
    let month = now.getMonth() + 1;
    if (dateMatch[2] && months[dateMatch[2]]) {
      month = months[dateMatch[2]];
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

  // 0c. ASSIGN / NEW TENANT CHECK
  const isAssign = /\b(?:assign|new\s+tenant|add\s+tenant|join\s+tenant|joining|joined)\b/i.test(lower) ||
                   (/\badd\b/i.test(lower) && (/\b(?:room|rm|r)\b/i.test(lower) || /\bto\b/i.test(lower) || /\b\d{3}\b/.test(lower) || /\bshare\b/i.test(lower))) ||
                   /\b(?:maintainance|maintenance|refundable)\b/i.test(lower);
  if (isAssign) {
    let cleaned = lower;
    if (dateRawStr) {
      cleaned = cleaned.replace(dateRawStr, ' ');
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

    // 2. Explicit Room: 'room 201' or 'rm 201'
    let roomNumber: string | null = null;
    const explicitRoom = cleaned.match(/\b(?:room|rm|r)\s*#?\s*(\d{1,4})\b/i);
    if (explicitRoom) {
      roomNumber = explicitRoom[1];
      cleaned = cleaned.replace(explicitRoom[0], ' ');
    }

    // 3. Due Day: 'due 28' or 'due day 28' or from date
    let dueDay: number | null = customDay;
    const dueMatch = cleaned.match(/\b(?:due|cycle|due\s*day|day)\s*[:=]?\s*(\d{1,2})\b/i);
    if (dueMatch) {
      dueDay = parseInt(dueMatch[1], 10);
      cleaned = cleaned.replace(dueMatch[0], ' ');
    }

    // 4. Monthly Rent / Room Fee (check prefix 'rent 8000' first, then suffix '8000 rent')
    let monthlyRent = 0;
    const rentAfter = cleaned.match(/\b(?:rent|monthly|rom\s*fee|room\s*fee|fee|feee)\s*[:=]?\s*(\d+(?:\.\d+)?)(k)?\b/i);
    if (rentAfter) {
      monthlyRent = parseFloat(rentAfter[1]) * (rentAfter[2] ? 1000 : 1);
      cleaned = cleaned.replace(rentAfter[0], ' ');
    } else {
      const rentBefore = cleaned.match(/(\d+(?:\.\d+)?)(k)?\s*(?:rent|monthly|rom\s*fee|room\s*fee|fee|feee)\b/i);
      if (rentBefore) {
        monthlyRent = parseFloat(rentBefore[1]) * (rentBefore[2] ? 1000 : 1);
        cleaned = cleaned.replace(rentBefore[0], ' ');
      }
    }

    // 5. Maintenance Fee (Non-refundable) (check prefix 'maintainance 1000' first, then suffix '1000 maintainance')
    let maintenanceFee = 0;
    const maintAfter = cleaned.match(/\b(?:maintainance|maintenance|non\s*refundable)\s*[:=]?\s*(\d+(?:\.\d+)?)(k)?\b/i);
    if (maintAfter) {
      maintenanceFee = parseFloat(maintAfter[1]) * (maintAfter[2] ? 1000 : 1);
      cleaned = cleaned.replace(maintAfter[0], ' ');
    } else {
      const maintBefore = cleaned.match(/(\d+(?:\.\d+)?)(k)?\s*(?:maintainance|maintenance|non\s*refundable)\b/i);
      if (maintBefore) {
        maintenanceFee = parseFloat(maintBefore[1]) * (maintBefore[2] ? 1000 : 1);
        cleaned = cleaned.replace(maintBefore[0], ' ');
      }
    }

    // 6. Refundable Security Deposit / Advance (check prefix 'adv 2000' first, then suffix '2000 adv')
    let refundableDeposit = 0;
    const refAfter = cleaned.match(/\b(?:refundable\s*(?:ammount|amount|deposit)?|security\s*deposit|sec\s*deposit|adv|advance|advan[cv]e)\s*[:=]?\s*(\d+(?:\.\d+)?)(k)?\b/i);
    if (refAfter) {
      refundableDeposit = parseFloat(refAfter[1]) * (refAfter[2] ? 1000 : 1);
      cleaned = cleaned.replace(refAfter[0], ' ');
    } else {
      const refBefore = cleaned.match(/(\d+(?:\.\d+)?)(k)?\s*(?:refundable\s*(?:ammount|amount|deposit)?|security\s*deposit|sec\s*deposit|adv|advance|advan[cv]e)\b/i);
      if (refBefore) {
        refundableDeposit = parseFloat(refBefore[1]) * (refBefore[2] ? 1000 : 1);
        cleaned = cleaned.replace(refBefore[0], ' ');
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
        if (monthlyRent === 0) {
          monthlyRent = parsedNum;
        } else if (refundableDeposit === 0) {
          refundableDeposit = parsedNum;
        }
        cleaned = cleaned.replace(nStr, ' ');
      }
    }

    // 9. Clean noise words for Tenant Name
    cleaned = cleaned.replace(/\b(?:assign|new\s+tenant|add\s+tenant|join\s+tenant|joining|joined|add|to|in)\b/gi, ' ').trim();
    const noiseWords = new Set(['room', 'rm', 'rent', 'monthly', 'adv', 'advance', 'advanve', 'deposit', 'due', 'day', 'in', 'at', 'fee', 'feee', 'for', 'to', 'and', '&', 'share', 'sharing', 'bed', 'joined', 'on', 'maintainance', 'maintenance', 'refundable', 'ammount', 'amount']);
    const nameTokens = cleaned.split(/\s+/).filter(w => w && !noiseWords.has(w) && !/^\d+$/.test(w));
    const tenantName = nameTokens.join(' ').trim();

    return {
      type: 'assign' as const,
      tenantName,
      roomNumber,
      monthlyRent,
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
  const hasRevenueWord = /\b(?:revenue|rent|rom\s*fee|room\s*fee|fee|feee|paid|sent|adv|advance|deposit|due)\b/.test(lower);

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
  const feeAfter = cleaned.match(/\b(?:paid|sent|fee|feee|rent|rom\s*fee|room\s*fee)\s*[:=]?\s*(\d+(?:\.\d+)?)(k)?\b/);
  if (feeAfter) {
    feeAmount = parseFloat(feeAfter[1]) * (feeAfter[2] ? 1000 : 1);
    cleaned = cleaned.replace(feeAfter[0], ' ');
  } else {
    const feeBefore = cleaned.match(/(\d+(?:\.\d+)?)(k)?\s*(?:paid|sent|fee|feee|rent|rom\s*fee|room\s*fee)\b/);
    if (feeBefore) {
      feeAmount = parseFloat(feeBefore[1]) * (feeBefore[2] ? 1000 : 1);
      cleaned = cleaned.replace(feeBefore[0], ' ');
    }
  }

  // 3. Explicit room match: 'room 204' or 'rm 204' or 'r 204'
  let roomNumber: string | null = null;
  const explicitRoom = cleaned.match(/\b(?:room|rm|r)\s*#?\s*(\d{1,4})\b/);
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
      if (feeAmount === 0) {
        feeAmount = parsed;
      } else if (advAmount === 0 && !lower.includes('due')) {
        advAmount = parsed;
      }
      cleaned = cleaned.replace(nStr, ' ');
    }
  }

  // 6. Name
  const noiseWords = ['rom', 'room', 'fee', 'rent', 'and', '&', 'paid', 'sent', 'adv', 'advance', 'due', 'for', 'of', 'pg', 'feee', 'revenue', 'on'];
  const nameTokens = cleaned.split(/\s+/).filter(w => w && !noiseWords.includes(w) && !/^\d+$/.test(w));
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
