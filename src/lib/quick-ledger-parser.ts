export interface QuickLedgerItem {
  id?: string;
  amount: number;
  description: string;
  category: string;
}

export function categorizeExpense(description: string): string {
  const lower = description.toLowerCase();
  if (/(?:rice|oil|vegitbale|vegetable|chicken|grocer|kirana|trader|milk|gas|cylinder|mess|food|breakfast|lunch|dinner|egg|tea|coffee|curd|tomato|onion|dall|dal)/i.test(lower)) {
    return 'Food';
  }
  if (/(?:water|tanker|electricity|current|power|bill|eb|wifi|internet|recharge)/i.test(lower)) {
    return 'Utilities';
  }
  if (/(?:salary|cleaner|cook|helper|security|manager|sweep|maid|payroll|staff)/i.test(lower)) {
    return 'Staff';
  }
  if (/(?:plumber|plumbing|pipe|tap|repair|carpenter|paint|bulb|light|fan|switch|ac|drain|hardware|maintenance)/i.test(lower)) {
    return 'Maintenance';
  }
  if (/(?:laundry|washing|detergent|soap)/i.test(lower)) {
    return 'Laundry';
  }
  return 'Others';
}

export function parseQuickLedgerText(input: string) {
  const text = (input || '').trim();
  const lower = text.toLowerCase();

  // 1. EXPENSES CHECK (Explicit keywords)
  const isExplicitExpense = /(?:^|\b)(?:expences|expenses|expence|expense|exp)\b/.test(lower);

  if (isExplicitExpense) {
    const cleaned = lower.replace(/(?:^|\b)(?:expences|expenses|expence|expense|exp)\b/g, ' ').trim();
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
  let cleaned = lower.replace(/(?:^|\b)(?:revenue)\b/g, ' ').trim();

  // Explicit Room match: 'room 101', 'rm 101', 'r 101'
  let roomNumber: string | null = null;
  const explicitRoomRegex = /(?:room|rm|r)\s*#?\s*(\d{1,4})\b/i;
  const explicitRoomMatch = cleaned.match(explicitRoomRegex);
  if (explicitRoomMatch) {
    roomNumber = explicitRoomMatch[1];
    cleaned = cleaned.replace(explicitRoomMatch[0], ' ');
  }

  // Advance / Deposit
  let advAmount = 0;
  const advRegex = /(\d+(?:\.\d+)?)(k)?\s*(?:adv|advance|deposit|dp)/i;
  const advMatch = cleaned.match(advRegex);
  if (advMatch) {
    advAmount = parseFloat(advMatch[1]) * (advMatch[2] ? 1000 : 1);
    cleaned = cleaned.replace(advMatch[0], ' ');
  }

  // Room Fee / Rent with keywords
  let feeAmount = 0;
  const feeRegex = /(\d+(?:\.\d+)?)(k)?\s*(?:rom\s*fee|room\s*fee|rent|fee|feee|paid|sent)/i;
  const feeMatch = cleaned.match(feeRegex);
  if (feeMatch) {
    feeAmount = parseFloat(feeMatch[1]) * (feeMatch[2] ? 1000 : 1);
    cleaned = cleaned.replace(feeMatch[0], ' ');
  }

  // If room number not explicitly prefixed, match standard 2-3 digit number (10-999)
  if (!roomNumber) {
    const candidateMatch = cleaned.match(/\b([1-9]\d{1,2})\b/);
    if (candidateMatch) {
      roomNumber = candidateMatch[1];
      cleaned = cleaned.replace(new RegExp('\\b' + candidateMatch[1] + '\\b'), ' ');
    }
  }

  // Any remaining number?
  const remainingNumbers = cleaned.match(/\b\d+(?:\.\d+)?(?:k)?\b/gi);
  if (remainingNumbers && remainingNumbers.length > 0) {
    for (const nStr of remainingNumbers) {
      const parsed = parseFloat(nStr) * (nStr.toLowerCase().includes('k') ? 1000 : 1);
      if (feeAmount === 0) {
        feeAmount = parsed;
      } else if (advAmount === 0 && !lower.includes('due')) {
        advAmount = parsed;
      }
      cleaned = cleaned.replace(new RegExp('\\b' + nStr + '\\b'), ' ');
    }
  }

  // Extract Name (clean remaining words)
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
