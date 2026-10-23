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
  const noiseWords = ['rom', 'room', 'fee', 'rent', 'and', '&', 'paid', 'sent', 'adv', 'advance', 'due', 'for', 'of', 'pg', 'feee', 'revenue'];
  const nameTokens = cleaned.split(/\s+/).filter(w => w && !noiseWords.includes(w) && !/^\d+$/.test(w));
  const tenantName = nameTokens.join(' ').trim();

  return {
    type: 'revenue' as const,
    roomNumber,
    tenantName,
    feeAmount,
    advAmount,
    totalAmount: feeAmount + advAmount
  };
}
