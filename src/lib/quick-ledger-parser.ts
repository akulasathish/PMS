export interface MonthPaymentBreakdown {
  month: string;
  amount: number;
  isOverdue?: boolean;
  isFullPayment?: boolean;
}

export interface QuickLedgerItem {
  id?: string;
  amount: number;
  description: string;
  category: string;
}

const FOOD_AND_EXPENSE_WORDS = new Set([
  // Food & Groceries
  'curd', 'milk', 'rice', 'oil', 'vegitbale', 'vegitbales', 'vegetable', 'vegetables', 'vegitables', 'veggies',
  'chicken', 'egg', 'eggs', 'tea', 'coffee', 'sugar', 'gas', 'cylinder',
  'paneer', 'dal', 'dall', 'atta', 'flour', 'wheat', 'onion', 'onions', 'potato', 'potatoes',
  'tomato', 'tomatoes', 'trader', 'traders', 'rythu', 'bidda', 'kirana', 'grocer', 'groceries', 'grocery', 'grociers', 'grocier',
  'provision', 'provisions', 'supermarket', 'dmart', 'ration', 'bread', 'butter', 'cheese', 'ghee',
  'aloo', 'pyaz', 'mirchi', 'allam', 'vellulli', 'pappu', 'nune', 'ginger', 'garlic', 'fruits', 'fruit', 'banana', 'apple',
  'biscuit', 'biscuits', 'snacks', 'namkeen', 'sweets', 'lemon', 'pudina', 'kothimeera',
  'mess', 'food', 'breakfast', 'lunch', 'dinner',

  // Utilities & Bills
  'water', 'tanker', 'electricity', 'current', 'power', 'bill', 'bills', 'eb', 'wifi', 'internet', 'recharge', 'diesel', 'petrol', 'generator',

  // Staff & Labor
  'salary', 'salaries', 'cleaner', 'cook', 'helper', 'security', 'manager', 'maid', 'sweeper', 'staff', 'wages', 'payroll',

  // Maintenance & Repairs
  'plumber', 'plumbing', 'pipe', 'tap', 'repair', 'repairs', 'carpenter', 'paint', 'painting', 'bulb', 'light', 'fan', 'switch', 'ac', 'drain', 'hardware', 'maintenance', 'electrician', 'pest', 'cctv', 'motor', 'lift', 'lock', 'keys', 'service', 'servicing',

  // Cleaning & Laundry
  'acid', 'broom', 'mop', 'soap', 'phenyl', 'harpic', 'detergent', 'cleaning', 'bleaching', 'laundry', 'washing',

  // Municipal & Miscellaneous
  'ghmc', 'garbage', 'waste', 'newspaper', 'paper', 'cable', 'dish', 'medicine', 'auto', 'transport', 'courier'
]);

export function categorizeExpense(description: string): string {
  const lower = description.toLowerCase();
  if (/(?:rice|oil|vegitbale|vegetable|veggie|chicken|grocer|grocier|kirana|trader|milk|gas|cylinder|mess|food|breakfast|lunch|dinner|egg|tea|coffee|curd|tomato|onion|dall|dal|paneer|atta|flour|wheat|potato|sugar|salt|chilli|masala|bread|butter|cheese|ghee|aloo|pyaz|mirchi|allam|vellulli|pappu|nune|provision|dmart|ration|biscuit|fruit|snack|sweet|ginger|garlic|lemon)/i.test(lower)) {
    return 'Food';
  }
  if (/(?:water|tanker|electricity|current|power|bill|eb|wifi|internet|recharge|diesel|petrol|generator)/i.test(lower)) {
    return 'Utilities';
  }
  if (/(?:salary|cleaner|cook|helper|security|manager|sweep|maid|payroll|staff|wages)/i.test(lower)) {
    return 'Staff';
  }
  if (/(?:plumber|plumbing|pipe|tap|repair|carpenter|paint|bulb|light|fan|switch|ac|drain|hardware|maintenance|electrician|pest|cctv|motor|lift|lock|key|service)/i.test(lower)) {
    return 'Maintenance';
  }
  if (/(?:laundry|washing|detergent|soap|acid|cleaning|broom|mop|phenyl|harpic|bleach)/i.test(lower)) {
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

export const isNoiseToken = (w: string): boolean => {
  const lw = w.toLowerCase().trim();
  if (!lw) return true;
  if (/^r+o+m+$/i.test(lw) || /^rm$/i.test(lw)) return true;
  if (/^(?:r+e+n+t+|ent|ren|rnt|reent|rrent|remt)$/i.test(lw)) return true;
  if (/^(?:f+e+|feee)$/i.test(lw)) return true;
  if (/^(?:he|she|they|having|has|had|have|his|her|their|him|them|update|accordingly|accorgingly)$/i.test(lw)) return true;
  if (/^(?:cleared?|clear|settled?|settle|balance|due|dues|overdue|pending)$/i.test(lw)) return true;
  if (/^\d+(?:st|nd|rd|th)?$/i.test(lw)) return true;
  if (lw.startsWith('maint') || lw.startsWith('ment') || lw.startsWith('refun') || lw.startsWith('paym') || lw.startsWith('payn')) return true;
  return false;
};

export function normalizeMonthName(m: string): string {
  const lm = m.toLowerCase().trim();
  if (lm.startsWith('jan')) return 'January';
  if (lm.startsWith('feb')) return 'February';
  if (lm.startsWith('mar')) return 'March';
  if (lm.startsWith('apr')) return 'April';
  if (lm === 'may') return 'May';
  if (lm.startsWith('jun')) return 'June';
  if (lm.startsWith('jul')) return 'July';
  if (lm.startsWith('aug')) return 'August';
  if (lm.startsWith('sep')) return 'September';
  if (lm.startsWith('oct')) return 'October';
  if (lm.startsWith('nov')) return 'November';
  if (lm.startsWith('dec')) return 'December';
  return m.charAt(0).toUpperCase() + m.slice(1).toLowerCase();
}

const NAME_MATCH_NOISE = new Set([
  'please', 'tenant', 'resident', 'guest', 'called', 'named', 'name',
  'mr', 'mrs', 'ms', 'shri', 'from', 'in', 'room', 'rm', 'rom', 'romm', 'rroom', 'rooom', 'rrom', 'rooomm', 'to', 'bed',
  'the', 'of', 'for', 'is', 'a', 'an', 'and', '&',
  'rent', 'ent', 'ren', 'rnt', 'reent', 'rrent', 'remt', 'fee', 'feee',
  'every', 'month', 'months', 'monthly', 'each', 'per', 'year',
  'maintainance', 'maintenance', 'maintance', 'maintence', 'maintanace', 'maintanance', 'maintanence', 'maint',
  'refundable', 'refundabale', 'refundble',
  'clear', 'cleared', 'settle', 'settled', 'balance', 'due', 'dues', 'overdue', 'pending'
]);

export function isResidentNameMatch(guestName?: string | null, queryName?: string | null): boolean {
  if (!guestName || !queryName) return false;

  const cleanTokens = (str: string) =>
    str
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w && !NAME_MATCH_NOISE.has(w) && !isNoiseToken(w));

  const gTokens = cleanTokens(guestName);
  const qTokens = cleanTokens(queryName);

  if (gTokens.length === 0 || qTokens.length === 0) return false;

  const gClean = gTokens.join(' ');
  const qClean = qTokens.join(' ');

  // 1. Exact or substring match on cleaned string
  if (gClean === qClean || gClean.includes(qClean) || qClean.includes(gClean)) {
    return true;
  }

  const isTokenMatch = (q: string, g: string): boolean => {
    if (q === g) return true;
    if (q.length >= 4 && g.length >= 4) {
      if (q.startsWith(g) || g.startsWith(q)) return true;
      if (levenshteinDistance(q, g) <= 1) return true;
      if (Math.min(q.length, g.length) >= 8 && levenshteinDistance(q, g) <= 2) return true;
    }
    return false;
  };

  // If both have multiple tokens (e.g. 'Sai Ganesh' vs 'Sai Krishna'):
  // Must match ALL tokens of query (or at least 2 tokens) so common prefixes like 'Sai' alone don't trigger false positives
  if (gTokens.length >= 2 && qTokens.length >= 2) {
    const qMatches = qTokens.filter(q => gTokens.some(g => isTokenMatch(q, g))).length;
    return qMatches >= Math.min(qTokens.length, gTokens.length);
  }

  // If one is a single token (e.g. searching 'Krishna' for 'Sai Krishna')
  for (const q of qTokens) {
    for (const g of gTokens) {
      if (isTokenMatch(q, g)) return true;
    }
  }

  return false;
}

export function sanitizeGuestName(name: string): string {
  if (!name) return 'Guest';
  const cleaned = name
    .split(/\s+/)
    .filter(token => {
      const t = token.toLowerCase().trim();
      if (!t) return false;
      if (/^r+o+m+$/i.test(t) || /^rm$/i.test(t)) return false;
      if (/^(?:r+e+n+t+|ent|ren|rnt|reent|rrent|remt)$/i.test(t)) return false;
      if (/^(?:f+e+|feee)$/i.test(t)) return false;
      if (NAME_MATCH_NOISE.has(t) || isNoiseToken(t)) return false;
      return true;
    })
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
    .trim();
  return cleaned || 'Guest';
}

export function parseQuickLedgerText(input: string) {
  const text = (input || '').trim();
  const lower = text.toLowerCase();
  const now = new Date();

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
  const monthFirstMatch = lower.match(/\b(?:(?:joined|paid|date|join)\s+)?(?:on\s+)?(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember))\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s+(20\d{2}))?\b/i);

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
  } else if (monthFirstMatch) {
    const day = parseInt(monthFirstMatch[2], 10);
    const now = new Date();
    let year = now.getFullYear();
    if (monthFirstMatch[3] && monthFirstMatch[3].length === 4) {
      year = parseInt(monthFirstMatch[3], 10);
    }
    const month = months[monthFirstMatch[1].toLowerCase()] || (now.getMonth() + 1);
    customDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    customDay = day;
    dateRawStr = monthFirstMatch[0];
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

  // 0b-1. MONTHLY REVENUE & EXPENSES REPORT CHECK
  // e.g. "revenue generated in the month of october", "revenue generated in the month of november", "october revenue", "revenue of october", "expenses of october", "i want a report of expences and revenue generated in this month"
  const isMonthlyReport = (
    /(?:revenue|income|collection|turnover|expenses?|expences?|pnl|profit|financial|report|summary|statement)\b/i.test(lower) &&
    /(?:month(?:\s+of)?|in\s+(?:the\s+)?month|this\s+month|current\s+month|monthly)\b/i.test(lower)
  ) || (
    /(?:revenue|income|expenses?|collection)\s+(?:of|for|in)?\s*(?:the\s+month\s+of\s+)?(?:january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(lower)
  ) || (
    /(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+(?:month\s+)?(?:revenue|income|collection|expenses?|report|summary)\b/i.test(lower)
  );

  const isCheckout = /\b(?:checkout|check\s*out|vacate)\b/i.test(lower);
  const isPaymentAction = /\b(?:record|log|enter|received?)\s+(?:a\s+)?payment\b/i.test(lower);
  const hasPaymentAmount = /\b(?:paid|sent)\s*[:=]?\s*\d+/i.test(lower) || 
                           /\b\d+\s*(?:paid|sent)\b/i.test(lower) ||
                           /\b(?:payment|amount|ammount|fee|rent)\s*(?:of)?\s*\d+/i.test(lower);
  const hasClearAction = /\b(?:clear(?:ed)?|settl(?:ed)?)\b/i.test(lower) && /\b\d{3,6}\b/.test(lower);
  const isUpdateIntent = /\b(?:change|update|shift|switch|modify|wants\s+to\s+change)\b/i.test(lower);
  const isMoveIntent = /\b(?:move|transfer)\b/i.test(lower);
  const isAddIntent = /^\s*(?:add|assign|new\s+tenant|join\b)/i.test(lower) || /\b(?:joined\s+on|check-?in|admission)\b/i.test(lower);

  if (isMonthlyReport && !isCheckout && !isUpdateIntent && !isMoveIntent && !isAddIntent && !hasPaymentAmount && !hasClearAction && !isPaymentAction) {
    const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    let targetMonth: string | null = null;
    let targetYear = now.getFullYear();

    const yrMatch = lower.match(/\b(20\d{2})\b/);
    if (yrMatch) {
      targetYear = parseInt(yrMatch[1], 10);
    }

    for (const m of monthNames) {
      if (new RegExp(`\\b${m}\\b`, 'i').test(lower)) {
        targetMonth = m.charAt(0).toUpperCase() + m.slice(1);
        break;
      }
    }

    if (!targetMonth) {
      const currentMonthIndex = now.getMonth();
      targetMonth = monthNames[currentMonthIndex].charAt(0).toUpperCase() + monthNames[currentMonthIndex].slice(1);
    }

    const monthNum = months[targetMonth.toLowerCase()] || (now.getMonth() + 1);
    const periodKey = `${targetYear}-${String(monthNum).padStart(2, '0')}`;

    return {
      type: 'monthly_report' as const,
      targetMonth,
      targetYear,
      periodKey
    };
  }
  const isIndividualReport = /(?:report|statement|ledger|history|status|dues?|balance|details|summary|how\s+much|info)/i.test(lower) &&
                             !isCheckout &&
                             !isPaymentAction &&
                             !isUpdateIntent &&
                             !isMoveIntent &&
                             !isAddIntent &&
                             !hasPaymentAmount &&
                             !hasClearAction;

  if (isIndividualReport) {
    let cleaned = lower;
    let roomNumber: string | null = null;
    const explicitRoom = cleaned.match(/\b(?:r+o+m+|rm)\s*#?\s*([a-z]?\d{1,4}[a-z]?)\b/i) ||
                         cleaned.match(/\br#\s*([a-z]?\d{1,4}[a-z]?)\b/i);
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

    const reportNoise = new Set([
      'report', 'of', 'for', 'statement', 'ledger', 'history', 'status', 'dues', 'due', 'balance',
      'details', 'summary', 'how', 'much', 'did', 'pay', 'paid', 'pending', 'owe', 'tenant', 'guest',
      'resident', 'person', 'guy', 'room', 'rm', 'rom', 'romm', 'rroom', 'rooom', 'rrom', 'rooomm',
      'rent', 'ent', 'ren', 'rnt', 'reent', 'rrent', 'remt', 'fee', 'feee',
      'the', 'a', 'an', 'show', 'check',
      'give', 'me', 'i', 'want', 'to', 'see', 'please', 'tell', 'about', 'is', 'in',
      'why', 'not', 'showing', 'payment', 'payments', 'month', 'october', 'september', 'august', 'july', 'june', 'what'
    ]);

    const nameTokens = cleaned.split(/[\s,]+/).filter(w => w && !reportNoise.has(w) && !isNoiseToken(w) && !/^\d+$/.test(w));
    const tenantName = nameTokens.join(' ').replace(/[^\w\s]/g, '').trim();

    if (tenantName || roomNumber) {
      return {
        type: 'tenant_report' as const,
        tenantName: tenantName || undefined,
        roomNumber: roomNumber || undefined
      };
    }
  }

  // 0c-1. CHECKOUT / VACATE TENANT CHECK
  if (isCheckout) {
    const isForce = /\b(?:force|forced)\b/i.test(lower);
    let cleaned = lower;

    // Room number
    let roomNumber: string | null = null;
    const explicitRoom = cleaned.match(/\b(?:r+o+m+|rm)\s*#?\s*([a-z]?\d{1,4}[a-z]?)\b/i) ||
                         cleaned.match(/\br#\s*([a-z]?\d{1,4}[a-z]?)\b/i);
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
      'from', 'in', 'room', 'rm', 'rom', 'romm', 'rroom', 'rooom', 'rrom', 'rooomm',
      'rent', 'ent', 'ren', 'rnt', 'reent', 'rrent', 'remt', 'fee', 'feee',
      'force', 'forced', 'vacate', 'now', 'to', 'bed',
      'name', 'called', 'named', 'the', 'a', 'an', 'for', 'of', 'person', 'guy', 'tenant'
    ]);
    const nameTokens = cleaned.split(/\s+/).filter(w => w && !noiseWords.has(w) && !isNoiseToken(w) && !/^\d+$/.test(w));
    const tenantName = nameTokens.join(' ').trim() || undefined;

    return {
      type: 'checkout' as const,
      roomNumber: roomNumber || undefined,
      tenantName,
      isForce
    };
  }

  // 0b2. MOVE / SHIFT / TRANSFER TENANT TO ANOTHER ROOM
  const isMove = /\b(?:move|shift|transfer|relocate)\b/i.test(lower) ||
                 (/\bchange\s*room\b/i.test(lower));
  if (isMove) {
    let cleaned = lower;

    // Optional new rent: 'rent 8000', 'fee 8000'
    let newRent: number | null = null;
    const rentMatch = cleaned.match(/\b(?:rent|fee|rate)\s*[:=]?\s*(\d+(?:\.\d+)?)(k)?\b/i);
    if (rentMatch) {
      newRent = parseFloat(rentMatch[1]) * (rentMatch[2] ? 1000 : 1);
      cleaned = cleaned.replace(rentMatch[0], ' ');
    }

    // Destination room: 'to room 201', 'into 201', 'to 201'
    let toRoom: string | null = null;
    const toMatch = cleaned.match(/\b(?:to|into|in)\s*(?:room|rom|rm)?\s*#?\s*([a-z]?\d{1,4}[a-z]?)\b/i);
    if (toMatch) {
      toRoom = toMatch[1];
      cleaned = cleaned.replace(toMatch[0], ' ');
    }

    // Source room: 'from room 204', 'from 204', 'out of 204'
    let fromRoom: string | null = null;
    const fromMatch = cleaned.match(/\b(?:from|out\s*of)\s*(?:room|rom|rm)?\s*#?\s*([a-z]?\d{1,4}[a-z]?)\b/i);
    if (fromMatch) {
      fromRoom = fromMatch[1];
      cleaned = cleaned.replace(fromMatch[0], ' ');
    }

    // Any lingering room number (e.g., 'move 204 akshith to 201')
    const lingeringRoom = cleaned.match(/\b(?:room|rom|rm)?\s*#?\s*([1-9]\d{2,3}[a-z]?)\b/i);
    if (lingeringRoom) {
      if (!fromRoom) fromRoom = lingeringRoom[1];
      cleaned = cleaned.replace(lingeringRoom[0], ' ');
    }

    const noiseWords = new Set([
      'move', 'shift', 'transfer', 'relocate', 'change', 'room', 'rom', 'rm',
      'of', 'from', 'to', 'into', 'in', 'tenant', 'guest', 'resident', 'please',
      'bed', 'person', 'guy', 'now', 'the', 'a', 'an', 'and', '&'
    ]);
    const nameTokens = cleaned.split(/\s+/).filter(w =>
      w && !noiseWords.has(w) && !isNoiseToken(w) && !/^\d+$/.test(w)
    );
    const tenantName = nameTokens.join(' ').trim() || undefined;

    return {
      type: 'move_tenant' as const,
      tenantName,
      fromRoom: fromRoom || undefined,
      toRoom: toRoom || undefined,
      newRent: newRent || undefined
    };
  }

  // 0c. UPDATE TENANT / CHANGE DATES OR RENT CHECK
  const isConversationalUpdate = /\bupdate\s+(?:accordingly|accorgingly|it|this|details|please|in\s+database)\b/i.test(lower) ||
                                 /\b(?:please\s+)?update\b\s*$/i.test(lower);
  const isExplicitUpdate = /\b(?:change|modify|edit|correct)\b/i.test(lower) ||
                           (/\bupdate\b/i.test(lower) && !isConversationalUpdate);

  const isUpdateTenant = isExplicitUpdate &&
                         !/\bjoined\s+on\b/i.test(lower) &&
                         /\b(?:joining|joined|join|due|cycle|rent|fee|date|day|tenant|resident|maintainance|maintenance|maintance|maintence|refundable|deposit|adv)\b/i.test(lower);
  if (isUpdateTenant) {
    let cleaned = lower;

    // 1. Room Number: explicit 'room 201' / 'rm 201' or standalone 3-digit
    let roomNumber: string | null = null;
    const explicitRoom = cleaned.match(/\b(?:r+o+m+|rm)\s*#?\s*([a-z]?\d{1,4}[a-z]?)\b/i) ||
                         cleaned.match(/\br#\s*([a-z]?\d{1,4}[a-z]?)\b/i);
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

    // 3. Due Day: 'due date to 10th', 'due to 10th', 'due 10', 'due date 1st', 'due date is 1st of every month', 'change due date of akshith to 10th'
    let newDueDay: number | null = null;
    const dueMatch = cleaned.match(/\b(?:due\s*(?:date|day|dat)?|cycle)\b(?:\s+(?:to|is|as|on|set\s+to|=|:))?\s*(\d{1,2})(?:st|nd|rd|th)?(?:\s+(?:of\s+)?(?:every|each)\s+month|\s+(?:every|each)\s+month)?\b/i) ||
                     cleaned.match(/\b(?:due\s*(?:date|day|dat)?|cycle)\b.*?\b(?:to|is|as|on|=|:)\s*(\d{1,2})(?:st|nd|rd|th)?\b/i) ||
                     cleaned.match(/\b(?:due\s*(?:date|day|dat)?|cycle)\b[^\d]*?(\d{1,2})(?:st|nd|rd|th)?(?:\s+(?:of\s+)?(?:every|each)\s+month|\s+(?:every|each)\s+month)?\b/i);
    if (dueMatch) {
      newDueDay = parseInt(dueMatch[1], 10);
      cleaned = cleaned.replace(/\b(?:due\s*(?:date|day|dat)?|cycle)\b/i, ' ');
      cleaned = cleaned.replace(new RegExp('\\b(?:to|is|as|on|=|:)?\\s*' + newDueDay + '(?:st|nd|rd|th)?\\b', 'i'), ' ');
    }

    // 4. New Monthly Rent / Fee: 'rent 8500', 'fee 8500', 'rent to 8500', 'romm fee paid 9000'
    let newMonthlyRent: number | null = null;
    const rentPaidExplicitInRent = cleaned.match(/\b(?:r+o+m+|rm)?\s*(?:fee|feee|r+e+n+t+|ent|ren|rnt|reent|remt)\s*(?:is\s*)?(?:paid|sent)\s*[:=]?\s*(\d+(?:\.\d+)?)(k)?\b/i);
    if (rentPaidExplicitInRent) {
      newMonthlyRent = parseFloat(rentPaidExplicitInRent[1]) * (rentPaidExplicitInRent[2] ? 1000 : 1);
      cleaned = cleaned.replace(rentPaidExplicitInRent[0], ' ');
    } else {
      const rentMatch = cleaned.match(/\b(?:r+e+n+t+|ent|ren|rnt|reent|remt|monthly\s*rent|r+o+m+\s*fee|rm\s*fee|fee|feee|monthly)\b[^\d]*?(\d+(?:\.\d+)?)(k)?\b/i);
      if (rentMatch) {
        newMonthlyRent = parseFloat(rentMatch[1]) * (rentMatch[2] ? 1000 : 1);
        cleaned = cleaned.replace(rentMatch[0], ' ');
      } else {
        const rentBefore = cleaned.match(/(\d+(?:\.\d+)?)(k)?\s*(?:r+e+n+t+|ent|ren|rnt|reent|remt|r+o+m+\s*fee|rm\s*fee|fee|feee)\b/i);
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
      'tenant', 'resident', 'guest', 'room', 'rm', 'rom', 'romm', 'rroom', 'rooom', 'rrom', 'rooomm',
      'rent', 'ent', 'ren', 'rnt', 'reent', 'rrent', 'remt', 'fee', 'feee', 'to', 'for', 'of',
      'and', '&', 'is', 'as', 'the', 'in', 'on', 'bed', 'paid', 'sent',
      'name', 'called', 'named', 'person', 'wants', 'want', 'his', 'her', 'their',
      'every', 'month', 'months', 'monthly', 'each', 'per', 'year', 'weekly', 'week',
      'maintainance', 'maintenance', 'maintance', 'maintence', 'maintanace', 'maintanance', 'maintanence', 'maint',
      'refundable', 'refundabale', 'refundble', 'deposit', 'ammount', 'amount',
      'adv', 'advance', 'due', 'date', 'day', 'joining', 'joined', 'join', 'non',
      'january', 'jan', 'february', 'feb', 'march', 'mar', 'april', 'apr', 'may', 'june', 'jun',
      'july', 'jul', 'august', 'aug', 'september', 'sep', 'october', 'oct', 'november', 'nov', 'december', 'dec'
    ]);
    const nameTokens = cleaned.split(/\s+/).filter(w =>
      w &&
      !noiseWords.has(w) &&
      !isNoiseToken(w) &&
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
                   (/\b(?:add|guest|join)\b/i.test(lower) && (/\b(?:room|rom|romm|rm|r)\b/i.test(lower) || /\bto\b/i.test(lower) || /\b\d{3}\b/.test(lower) || /\bshare\b/i.test(lower) || /\bdays?\b/i.test(lower))) ||
                   (/\b(?:maintainance|maintenance|maintance|maintence|maintanace|maintanance|maintanence|refundable)\b/i.test(lower) &&
                    /\b(?:rent|monthly|room\s*fee|rom\s*fee|romm\s*fee|fee|feee|total\s*fee|joined|joining|adv\b|advance)\b/i.test(lower) &&
                    !/\bpaid\s*(?:only\s*)?(?:maintainance|maintenance|maintance|maintence|refundable)\b/i.test(lower));
  if (isAssign) {
    let cleaned = lower;
    if (dateRawStr) {
      cleaned = cleaned.replace(dateRawStr, ' ');
    }
    // Strip additional date mentions (e.g. "on 8th june 2026", "on 8th october") so calendar years never get confused with rent amounts
    cleaned = cleaned.replace(/\b(?:on\s+)?\d{1,2}(?:st|nd|rd|th)?\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember))(?:\s+20\d{2})?\b/gi, ' ');
    cleaned = cleaned.replace(/\b(?:on\s+)?\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/gi, ' ');
    cleaned = cleaned.replace(/[\\/,]/g, ' ');

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
      const explicitRoom = cleaned.match(/\b(?:r+o+m+|rm|r)\s*#?\s*(\d{1,4})\b/i);
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
        'assign', 'new', 'tenant', 'guest', 'add', 'joined', 'joining', 'join', 'to', 'in',
        'room', 'rm', 'rom', 'romm', 'rroom', 'rooom', 'rrom', 'rooomm',
        'rent', 'ent', 'ren', 'rnt', 'reent', 'rrent', 'remt', 'fee', 'feee',
        'daily', 'basis', 'per', 'day', 'days', 'total', 'paid', 'sent', 'only', 'for', 'pending', 'pedning',
        'bal', 'balance', 'and', '&', 'at'
      ]);
      const nameTokens = cleaned.split(/\s+/).filter(w => w && !noiseWords.has(w) && !isNoiseToken(w) && !/^\d+$/.test(w) && !/^[^\w]+$/.test(w));
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
    const explicitRoom = cleaned.match(/\b(?:r+o+m+|rm)\s*#?\s*([a-z]?\d{1,4}[a-z]?)\b/i) ||
                         cleaned.match(/\br#\s*([a-z]?\d{1,4}[a-z]?)\b/i);
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

    // 3. Due Day: 'due 28' or 'due day 28' or 'due date is 1st' or 'due date is 1st of every month'
    let dueDay: number | null = null;
    const dueMatch = cleaned.match(/\b(?:due\s*(?:dat|date)?|cycle|due\s*day)\s*(?:is|to|on)?\s*[:=]?\s*(\d{1,2})(?:st|nd|rd|th)?(?:\s+(?:of\s+)?(?:every|each)\s+month|\s+(?:every|each)\s+month)?\b/i) ||
                     cleaned.match(/\b(?:due|cycle|due\s*day|day)\s*[:=]?\s*(\d{1,2})(?:st|nd|rd|th)?(?:\s+(?:of\s+)?(?:every|each)\s+month|\s+(?:every|each)\s+month)?\b/i);
    if (dueMatch) {
      dueDay = parseInt(dueMatch[1], 10);
      cleaned = cleaned.replace(dueMatch[0], ' ');
    } else if (customDay) {
      dueDay = customDay;
    }

    // 4. Monthly Rent / Room Fee (check explicit due, then paid, then general amounts)
    let monthlyRent = 0;
    let rentPaid = 0;

    // 4a. Check Rent Due: e.g. "room fee due 8000", "room fee 8000 due", "due 8000 room fee", "8000 room fee due"
    const rentDuePattern1 = cleaned.match(/\b(?:r+o+m+|rm)?\s*(?:fee|feee|r+e+n+t+|ent|ren|rnt|reent|remt)\s*(?:is\s*)?(?:due|pending|pedning)\s*[:=]?\s*(\d+(?:\.\d+)?)(k)?\b/i);
    const rentDuePattern2 = cleaned.match(/\b(?:due|pending|pedning)\s*[:=]?\s*(?:r+o+m+|rm)?\s*(?:fee|feee|r+e+n+t+|ent|ren|rnt|reent|remt)\s*[:=]?\s*(\d+(?:\.\d+)?)(k)?\b/i);
    const rentDuePattern3 = cleaned.match(/\b(?:due|pending|pedning)\s*[:=]?\s*(\d+(?:\.\d+)?)(k)?\s*(?:r+o+m+|rm)?\s*(?:fee|feee|r+e+n+t+|ent|ren|rnt|reent|remt)\b/i);
    const rentDuePattern4 = cleaned.match(/(\d+(?:\.\d+)?)(k)?\s*(?:r+o+m+|rm)?\s*(?:fee|feee|r+e+n+t+|ent|ren|rnt|reent|remt)\s*(?:is\s*)?(?:due|pending|pedning)\b/i);
    const rentDuePattern5 = cleaned.match(/\b(?:r+o+m+|rm)?\s*(?:fee|feee|r+e+n+t+|ent|ren|rnt|reent|remt)\s*[:=]?\s*(\d+(?:\.\d+)?)(k)?\s*(?:is\s*)?(?:due|pending|pedning)\b/i);

    if (rentDuePattern1) {
      const amt = parseFloat(rentDuePattern1[1]) * (rentDuePattern1[2] ? 1000 : 1);
      monthlyRent = amt;
      rentPaid = 0;
      cleaned = cleaned.replace(rentDuePattern1[0], ' ');
    } else if (rentDuePattern2) {
      const amt = parseFloat(rentDuePattern2[1]) * (rentDuePattern2[2] ? 1000 : 1);
      monthlyRent = amt;
      rentPaid = 0;
      cleaned = cleaned.replace(rentDuePattern2[0], ' ');
    } else if (rentDuePattern3) {
      const amt = parseFloat(rentDuePattern3[1]) * (rentDuePattern3[2] ? 1000 : 1);
      monthlyRent = amt;
      rentPaid = 0;
      cleaned = cleaned.replace(rentDuePattern3[0], ' ');
    } else if (rentDuePattern4) {
      const amt = parseFloat(rentDuePattern4[1]) * (rentDuePattern4[2] ? 1000 : 1);
      monthlyRent = amt;
      rentPaid = 0;
      cleaned = cleaned.replace(rentDuePattern4[0], ' ');
    } else if (rentDuePattern5) {
      const amt = parseFloat(rentDuePattern5[1]) * (rentDuePattern5[2] ? 1000 : 1);
      monthlyRent = amt;
      rentPaid = 0;
      cleaned = cleaned.replace(rentDuePattern5[0], ' ');
    } else {
      // 4b. Check Rent Partial Payment: e.g. "room fee 8000 paid only 5000", "fee 8000 paid 5000"
      const rentExplicitPartial = cleaned.match(/\b(?:r+o+m+|rm)?\s*(?:fee|feee|r+e+n+t+|ent|ren|rnt|reent|remt)\s*[:=]?\s*(\d+(?:\.\d+)?)(k)?\s*(?:but\s*)?(?:paid|sent)\s*(?:only\s*)?[:=]?\s*(\d+(?:\.\d+)?)(k)?\b/i);
      if (rentExplicitPartial) {
        monthlyRent = parseFloat(rentExplicitPartial[1]) * (rentExplicitPartial[2] ? 1000 : 1);
        rentPaid = parseFloat(rentExplicitPartial[3]) * (rentExplicitPartial[4] ? 1000 : 1);
        cleaned = cleaned.replace(rentExplicitPartial[0], ' ');
      } else {
        // 4c. Check Rent Paid Full or with Month Mention (e.g. "room fee for october month 7000 paid")
        const rentWithMonth = cleaned.match(/\b(?:r+o+m+|rm)?\s*(?:fee|feee|r+e+n+t+|ent|ren|rnt|reent|remt)\s*(?:for\s+(?:[a-z]+\s+)?(?:month\s+)?)?[:=]?\s*(\d+(?:\.\d+)?)(k)?(?:\s+(?:is\s*)?(?:paid|sent))?\b/i);
        if (rentWithMonth) {
          const amt = parseFloat(rentWithMonth[1]) * (rentWithMonth[2] ? 1000 : 1);
          monthlyRent = amt;
          if (/paid|sent/i.test(rentWithMonth[0])) {
            rentPaid = amt;
          }
          cleaned = cleaned.replace(rentWithMonth[0], ' ');
        }
        const rentPaidPattern1 = cleaned.match(/\b(?:r+o+m+|rm)?\s*(?:fee|feee|r+e+n+t+|ent|ren|rnt|reent|remt)\s*(?:is\s*)?(?:paid|sent)\s*[:=]?\s*(\d+(?:\.\d+)?)(k)?\b/i);
        const rentPaidPattern2 = cleaned.match(/\b(?:paid|sent)\s*[:=]?\s*(?:r+o+m+|rm)?\s*(?:fee|feee|r+e+n+t+|ent|ren|rnt|reent|remt)\s*[:=]?\s*(\d+(?:\.\d+)?)(k)?\b/i);
        const rentPaidPattern3 = cleaned.match(/\b(?:paid|sent)\s*[:=]?\s*(\d+(?:\.\d+)?)(k)?\s*(?:r+o+m+|rm)?\s*(?:fee|feee|r+e+n+t+|ent|ren|rnt|reent|remt)\b/i);
        const rentPaidPattern4 = cleaned.match(/(\d+(?:\.\d+)?)(k)?\s*(?:r+o+m+|rm)?\s*(?:fee|feee|r+e+n+t+|ent|ren|rnt|reent|remt)\s*(?:is\s*)?(?:paid|sent)\b/i);
        const rentPaidPattern5 = cleaned.match(/\b(?:r+o+m+|rm)?\s*(?:fee|feee|r+e+n+t+|ent|ren|rnt|reent|remt)\s*[:=]?\s*(\d+(?:\.\d+)?)(k)?\s*(?:is\s*)?(?:paid|sent)\b/i);

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
        } else if (rentPaidPattern5) {
          const amt = parseFloat(rentPaidPattern5[1]) * (rentPaidPattern5[2] ? 1000 : 1);
          monthlyRent = amt;
          rentPaid = amt;
          cleaned = cleaned.replace(rentPaidPattern5[0], ' ');
        } else {
          const rentBefore = cleaned.match(/(\d+(?:\.\d+)?)(k)?\s*(?:r+e+n+t+|ent|ren|rnt|reent|remt|monthly|r+o+m+\s*fee|rm\s*fee|fee|feee)\b/i);
          if (rentBefore) {
            const parsedAmt = parseFloat(rentBefore[1]) * (rentBefore[2] ? 1000 : 1);
            if (parsedAmt < 2020 || parsedAmt > 2035 || rentBefore[2]) {
              monthlyRent = parsedAmt;
              cleaned = cleaned.replace(rentBefore[0], ' ');
            }
          } else {
            const rentAfter = cleaned.match(/\b(?:r+e+n+t+|ent|ren|rnt|reent|remt|monthly|r+o+m+\s*fee|rm\s*fee|r+o+m+\s*rent|rm\s*rent|fee|feee)\s*[:=]?\s*(\d+(?:\.\d+)?)(k)?\b/i);
            if (rentAfter) {
              const parsedAmt = parseFloat(rentAfter[1]) * (rentAfter[2] ? 1000 : 1);
              if (parsedAmt < 2020 || parsedAmt > 2035 || rentAfter[2]) {
                monthlyRent = parsedAmt;
                cleaned = cleaned.replace(rentAfter[0], ' ');
              }
            }
          }
        }
      }
    }

    // 5. Maintenance Fee (Non-refundable) (Check due first, then paid, then fallback)
    let maintenanceFee = 0;
    let maintenancePaid: number | undefined = undefined;

    const maintDueMatch = cleaned.match(/\b(?:maint[a-z]*|ment[a-z]*|non\s*refundable)\s*(?:fee|ammount|amount|charges|charge)?\s*(?:is\s*)?(?:due|pending|pedning)\s*[:=]?\s*(\d+(?:\.\d+)?)(k)?\b/i) ||
                          cleaned.match(/\b(?:maint[a-z]*|ment[a-z]*|non\s*refundable)\s*(?:fee|ammount|amount|charges|charge)?\s*[:=]?\s*(\d+(?:\.\d+)?)(k)?\s*(?:is\s*)?(?:due|pending|pedning)\b/i) ||
                          cleaned.match(/\b(?:due|pending|pedning)\s*[:=]?\s*(\d+(?:\.\d+)?)(k)?\s*(?:maint[a-z]*|ment[a-z]*|non\s*refundable)\b/i) ||
                          cleaned.match(/(\d+(?:\.\d+)?)(k)?\s*(?:maint[a-z]*|ment[a-z]*|non\s*refundable)\s*(?:fee|ammount|amount|charges|charge)?\s*(?:is\s*)?(?:due|pending|pedning)\b/i);

    if (maintDueMatch) {
      maintenanceFee = parseFloat(maintDueMatch[1]) * (maintDueMatch[2] ? 1000 : 1);
      maintenancePaid = 0;
      cleaned = cleaned.replace(maintDueMatch[0], ' ');
    } else {
      const maintPaidMatch = cleaned.match(/\b(?:maint[a-z]*|ment[a-z]*|non\s*refundable)\s*(?:fee|ammount|amount|charges|charge)?\s*(?:is\s*)?(?:paid|sent)\s*[:=]?\s*(\d+(?:\.\d+)?)(k)?\b/i) ||
                             cleaned.match(/\b(?:maint[a-z]*|ment[a-z]*|non\s*refundable)\s*(?:fee|ammount|amount|charges|charge)?\s*[:=]?\s*(\d+(?:\.\d+)?)(k)?\s*(?:is\s*)?(?:paid|sent)\b/i) ||
                             cleaned.match(/\b(?:paid|sent)\s*[:=]?\s*(\d+(?:\.\d+)?)(k)?\s*(?:maint[a-z]*|ment[a-z]*|non\s*refundable)\b/i) ||
                             cleaned.match(/(\d+(?:\.\d+)?)(k)?\s*(?:maint[a-z]*|ment[a-z]*|non\s*refundable)\s*(?:fee|ammount|amount|charges|charge)?\s*(?:is\s*)?(?:paid|sent)\b/i);

      if (maintPaidMatch) {
        maintenanceFee = parseFloat(maintPaidMatch[1]) * (maintPaidMatch[2] ? 1000 : 1);
        maintenancePaid = maintenanceFee;
        cleaned = cleaned.replace(maintPaidMatch[0], ' ');
      } else {
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
      }
    }

    // 6. Refundable Security Deposit / Advance (Check due first, then paid, then fallback)
    let refundableDeposit = 0;
    let depositPaid: number | undefined = undefined;

    const refDueMatch = cleaned.match(/\b(?:refun[a-z]*\s*(?:ammount|amount|deposit|fee)?|security\s*deposit|sec\s*deposit|deposit|adv|advance|advan[cv]e)\s*(?:is\s*)?(?:due|pending|pedning)\s*[:=]?\s*(\d+(?:\.\d+)?)(k)?\b/i) ||
                        cleaned.match(/\b(?:refun[a-z]*\s*(?:ammount|amount|deposit|fee)?|security\s*deposit|sec\s*deposit|deposit|adv|advance|advan[cv]e)\s*[:=]?\s*(\d+(?:\.\d+)?)(k)?\s*(?:is\s*)?(?:due|pending|pedning)\b/i) ||
                        cleaned.match(/\b(?:due|pending|pedning)\s*[:=]?\s*(\d+(?:\.\d+)?)(k)?\s*(?:refun[a-z]*\s*(?:ammount|amount|deposit|fee)?|security\s*deposit|sec\s*deposit|deposit|adv|advance|advan[cv]e)\b/i) ||
                        cleaned.match(/(\d+(?:\.\d+)?)(k)?\s*(?:refun[a-z]*\s*(?:ammount|amount|deposit|fee)?|security\s*deposit|sec\s*deposit|deposit|adv|advance|advan[cv]e)\s*(?:is\s*)?(?:due|pending|pedning)\b/i);

    if (refDueMatch) {
      refundableDeposit = parseFloat(refDueMatch[1]) * (refDueMatch[2] ? 1000 : 1);
      depositPaid = 0;
      cleaned = cleaned.replace(refDueMatch[0], ' ');
    } else {
      const refPaidMatch = cleaned.match(/\b(?:refun[a-z]*\s*(?:ammount|amount|deposit|fee)?|security\s*deposit|sec\s*deposit|deposit|adv|advance|advan[cv]e)\s*(?:is\s*)?(?:paid|sent)\s*[:=]?\s*(\d+(?:\.\d+)?)(k)?\b/i) ||
                           cleaned.match(/\b(?:refun[a-z]*\s*(?:ammount|amount|deposit|fee)?|security\s*deposit|sec\s*deposit|deposit|adv|advance|advan[cv]e)\s*[:=]?\s*(\d+(?:\.\d+)?)(k)?\s*(?:is\s*)?(?:paid|sent)\b/i) ||
                           cleaned.match(/\b(?:paid|sent)\s*[:=]?\s*(\d+(?:\.\d+)?)(k)?\s*(?:refun[a-z]*\s*(?:ammount|amount|deposit|fee)?|security\s*deposit|sec\s*deposit|deposit|adv|advance|advan[cv]e)\b/i) ||
                           cleaned.match(/(\d+(?:\.\d+)?)(k)?\s*(?:refun[a-z]*\s*(?:ammount|amount|deposit|fee)?|security\s*deposit|sec\s*deposit|deposit|adv|advance|advan[cv]e)\s*(?:is\s*)?(?:paid|sent)\b/i);

      if (refPaidMatch) {
        refundableDeposit = parseFloat(refPaidMatch[1]) * (refPaidMatch[2] ? 1000 : 1);
        depositPaid = refundableDeposit;
        cleaned = cleaned.replace(refPaidMatch[0], ' ');
      } else {
        const refBefore = cleaned.match(/(\d+(?:\.\d+)?)(k)?\s*(?:refun[a-z]*\s*(?:ammount|amount|deposit|fee)?|security\s*deposit|sec\s*deposit|deposit|adv|advance|advan[cv]e)\b/i);
        if (refBefore) {
          refundableDeposit = parseFloat(refBefore[1]) * (refBefore[2] ? 1000 : 1);
          cleaned = cleaned.replace(refBefore[0], ' ');
        } else {
          const refAfter = cleaned.match(/\b(?:refun[a-z]*\s*(?:ammount|amount|deposit|fee)?|security\s*deposit|sec\s*deposit|deposit|adv|advance|advan[cv]e)\s*(?:is\s*)?(?:paid|sent)?\s*[:=]?\s*(\d+(?:\.\d+)?)(k)?\b/i);
          if (refAfter) {
            refundableDeposit = parseFloat(refAfter[1]) * (refAfter[2] ? 1000 : 1);
            cleaned = cleaned.replace(refAfter[0], ' ');
          }
        }
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
    let rentPaymentDate: string | undefined = undefined;
    if (rentPaid === 0) {
      // Check explicit rent-specific partial payment: e.g. "room fee 8000 paid only 5000", "fee 8000 paid 5000"
      const rentExplicitPartial = lower.match(/\b(?:room|rom|romm|rm)?\s*(?:fee|rent|feee)\s*[:=]?\s*\d+(?:\.\d+)?(?:k)?\s*(?:but\s*)?(?:paid|sent)\s*(?:only\s*)?[:=]?\s*(\d+(?:\.\d+)?)(k)?\b/i);
      if (rentExplicitPartial) {
        rentPaid = parseFloat(rentExplicitPartial[1]) * (rentExplicitPartial[2] ? 1000 : 1);
      } else {
        const paidOnlyMatch = lower.match(/\bpaid\s*only\s*(?:for\s*)?(\d+(?:\.\d+)?)(k)?\b/i);
        if (paidOnlyMatch) {
          const onlyAmt = parseFloat(paidOnlyMatch[1]) * (paidOnlyMatch[2] ? 1000 : 1);
          if (/non\s*refundable/i.test(lower)) {
            rentPaid = 0;
          } else if (onlyAmt > (maintenanceFee + refundableDeposit)) {
            rentPaid = onlyAmt - (maintenanceFee + refundableDeposit);
          } else {
            rentPaid = onlyAmt;
          }
        } else {
          const isRentDue = /\b(?:room\s*fee|rom\s*fee|romm\s*fee|rent|fee)\s*(?:is\s*)?(?:due|pending|pedning)\b/i.test(lower) ||
                            /\b(?:due|pending|pedning)\s*(?:room\s*fee|rom\s*fee|romm\s*fee|rent|fee)\b/i.test(lower);
          if (!isRentDue) {
            const rentPaidExplicit = lower.match(/\b(?:paid|sent)\s*[:=]?\s*(\d+(?:\.\d+)?)(k)?\s*(?:rent|room\s*fee|rom\s*fee|romm\s*fee|monthly|fee)\b/i) ||
                                     lower.match(/(\d+(?:\.\d+)?)(k)?\s*(?:rent|room\s*fee|rom\s*fee|romm\s*fee|monthly|fee)\s*(?:is\s*)?(?:paid|sent)\b/i) ||
                                     lower.match(/\b(?:room|rom|romm|rm)?\s*(?:fee|rent|feee)\s*(?:is\s*)?(?:paid|sent)\s*[:=]?\s*(\d+(?:\.\d+)?)(k)?\b/i);
            const rentPaidOnDate = lower.match(/\b(?:paid|sent)\s*[:=]?\s*(\d+(?:\.\d+)?)(k)?(?:\s+(?:on|date)?\s*(\d{1,2})(?:st|nd|rd|th)?(?:\s+([a-z]+))?(?:\s+(20\d{2}))?)?\b/i);

            if (rentPaidExplicit) {
              rentPaid = parseFloat(rentPaidExplicit[1]) * (rentPaidExplicit[2] ? 1000 : 1);
            } else if (rentPaidOnDate && !rentPaidOnDate[0].toLowerCase().includes('maint') && !rentPaidOnDate[0].toLowerCase().includes('refun')) {
              const amt = parseFloat(rentPaidOnDate[1]) * (rentPaidOnDate[2] ? 1000 : 1);
              if (amt === monthlyRent || (monthlyRent > 0 && amt > 0)) {
                rentPaid = amt;
                if (rentPaidOnDate[3] && rentPaidOnDate[4] && months[rentPaidOnDate[4].toLowerCase()]) {
                  const pDay = parseInt(rentPaidOnDate[3], 10);
                  const pMonth = months[rentPaidOnDate[4].toLowerCase()];
                  const pYear = rentPaidOnDate[5] ? parseInt(rentPaidOnDate[5], 10) : new Date().getFullYear();
                  rentPaymentDate = `${pYear}-${String(pMonth).padStart(2, '0')}-${String(pDay).padStart(2, '0')}`;
                }
              }
            } else if (/\bpaid\s*(?:rent|room\s*fee|rom\s*fee|romm\s*fee|fee)\b/i.test(lower)) {
              rentPaid = monthlyRent;
            }
          }
        }
      }
    }

    // 9. Clean noise words for Tenant Name
    cleaned = cleaned.replace(/\b(?:assign|new\s+tenant|add\s+tenant|join\s+tenant|joining|joined|add|to|in|tenant\s+name\s+called|tenant\s+called|name\s+called)\b/gi, ' ').trim();
    const noiseWords = new Set([
      'room', 'rom', 'romm', 'rroom', 'rooom', 'rrom', 'rooomm', 'rm',
      'rent', 'ent', 'ren', 'rnt', 'reent', 'rrent', 'remt', 'fee', 'feee',
      'monthly', 'adv', 'advance', 'advanve', 'deposit', 'due', 'day', 'in', 'at',
      'for', 'to', 'and', '&', 'share', 'sharing', 'bed', 'joined', 'on', 'of',
      'every', 'month', 'months', 'each', 'per', 'year', 'weekly', 'week', 'also', 'as', 'well', 'both', 'with', 'by', 'which', 'that', 'this', 'payment',
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
      !isNoiseToken(w) &&
      !w.startsWith('maint') &&
      !w.startsWith('ment') &&
      !w.startsWith('refun') &&
      !/^\d+(?:st|nd|rd|th)?$/i.test(w)
    );

    // Direct positional extraction: e.g. "add danush to room 202" or "add danush in 202" or "join sathish to room 201"
    let positionalName: string | null = null;
    const posMatch = lower.match(/\b(?:add|assign|new\s+tenant|join\s+tenant|join)\s+([a-z\s]+?)\s+(?:to\s+(?:r+o+m+|rm)|in\s+(?:r+o+m+|rm)|to|in|r+o+m+|rm)\s*#?\s*(\d{1,4})\b/i);
    if (posMatch) {
      const candidateTokens = posMatch[1].trim().split(/\s+/).filter(w => w && !noiseWords.has(w) && !isNoiseToken(w) && !/^\d+$/.test(w));
      if (candidateTokens.length > 0) {
        positionalName = candidateTokens.join(' ');
      }
    }

    const rawTokens = (positionalName || nameTokens.join(' ')).split(/\s+/).filter(w => w && !isNoiseToken(w) && !noiseWords.has(w));
    const tenantName = rawTokens.join(' ').replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();

    return {
      type: 'assign' as const,
      tenantName,
      roomNumber,
      monthlyRent,
      rentPaid,
      advAmount: refundableDeposit,
      refundableDeposit,
      depositPaid: depositPaid !== undefined ? depositPaid : refundableDeposit,
      maintenanceFee,
      maintenancePaid: maintenancePaid !== undefined ? maintenancePaid : maintenanceFee,
      sharing,
      checkInDate: customDate,
      dueDay,
      rentPaymentDate
    };
  }

  // 1. EXPENSES CHECK (Explicit keywords or known expense item words)
  const isExplicitExpense = /(?:^|\b)(?:expences|expenses|expence|expense|exp|spent|spend|spending|paid\s+for)\b/i.test(lower);
  const words = lower.split(/[\s,]+/);
  const hasExpenseWord = words.some(w => FOOD_AND_EXPENSE_WORDS.has(w) || /^groc/i.test(w) || /^veget/i.test(w) || /^vegit/i.test(w));
  const hasRevenueWord = /\b(?:revenue|rent|rom\s*fee|room\s*fee|romm\s*fee|fee|feee|paid|sent|adv|advance|deposit|due)\b/.test(lower) && !isExplicitExpense;

  const isExpense = isExplicitExpense || (hasExpenseWord && !hasRevenueWord);

  if (isExpense) {
    const cleaned = lower.replace(/\b(?:expences|expenses|expence|expense|exp|spent|spend|spending|paid\s+for)\b/g, ' ')
                         .replace(/,/g, ' ')
                         .trim();
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
        const rawDesc = descWords.join(' ').replace(/^(?:on|for)\s+/i, '').trim();
        const desc = rawDesc || 'General Expense';
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
            const rawDesc = descWords.join(' ').replace(/^(?:on|for)\s+/i, '').trim();
            const desc = rawDesc || 'General Expense';
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
  let cleaned = lower.replace(/\b(?:revenue|record\s+a\s+payment\s+of|record\s+payment\s+of|record\s+payment|record)\b/g, ' ').trim();
  if (dateRawStr) {
    cleaned = cleaned.replace(dateRawStr, ' ');
  }

  // 1. Explicit or standalone room number first
  let roomNumber: string | null = null;
  const explicitRoom = cleaned.match(/\b(?:r+o+m+|rm)\s*#?\s*([a-z]?\d{1,4}[a-z]?)\b/i) ||
                       cleaned.match(/\br#\s*([a-z]?\d{1,4}[a-z]?)\b/i);
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

  // 2. Multi-Month / Month-Specific Payment Breakdown:
  // e.g. "record payment of danush overdue amount of 2000 of september month and full payment for october"
  const monthNames = 'january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec';
  const monthPayments: MonthPaymentBreakdown[] = [];

  // Pattern A: "1000 sep month due cleared" / "overdue amount of 2000 of september month" / "2000 of september" / "2000 september due"
  const patternA = new RegExp(
    `(?:over\\s*due|dues|due|pending)?\\s*(?:ammount|amount|rent|fee)?\\s*(?:of|is)?\\s*(\\d+(?:\\.\\d+)?)(k)?\\s*(?:of|for|in)?\\s*(${monthNames})(?:\\s+month)?(?:\\s*(?:over\\s*due|dues|due|pending))?(?:\\s*(?:cleared?|settled?|paid))?`,
    'gi'
  );
  let matchA;
  while ((matchA = patternA.exec(cleaned)) !== null) {
    const amt = parseFloat(matchA[1]) * (matchA[2] ? 1000 : 1);
    const mName = normalizeMonthName(matchA[3]);
    const isOverdue = /over\s*due|dues|due|pending|clear/i.test(matchA[0]);
    monthPayments.push({
      month: mName,
      amount: amt,
      isOverdue
    });
    cleaned = cleaned.replace(matchA[0], ' ');
  }

  // Pattern A2: Month before Amount: "sep month 1000 due cleared" / "sep month due 1000 cleared" / "sep 1000" / "september overdue 2000"
  const patternA2 = new RegExp(
    `(?:for|in|of)?\\s*(${monthNames})(?:\\s+month)?\\s*(?:over\\s*due|dues|due|pending)?\\s*(?:ammount|amount|rent|fee)?\\s*(?:of|is)?\\s*(\\d+(?:\\.\\d+)?)(k)?(?:\\s*(?:over\\s*due|dues|due|pending))?(?:\\s*(?:cleared?|settled?|paid))?`,
    'gi'
  );
  let matchA2;
  while ((matchA2 = patternA2.exec(cleaned)) !== null) {
    const mName = normalizeMonthName(matchA2[1]);
    const amt = parseFloat(matchA2[2]) * (matchA2[3] ? 1000 : 1);
    const isOverdue = /over\s*due|dues|due|pending|clear/i.test(matchA2[0]);
    monthPayments.push({
      month: mName,
      amount: amt,
      isOverdue
    });
    cleaned = cleaned.replace(matchA2[0], ' ');
  }

  // Pattern B: "full payment for october" / "full rent for october"
  const patternB = new RegExp(`(?:full|total)?\\s*(?:paym[a-z]*|rent|fee)\\s+(?:for|of|in)\\s*(${monthNames})(?:\\s+month)?`, 'gi');
  let matchB;
  while ((matchB = patternB.exec(cleaned)) !== null) {
    const mName = normalizeMonthName(matchB[1]);
    monthPayments.push({
      month: mName,
      amount: 0,
      isFullPayment: true
    });
    cleaned = cleaned.replace(matchB[0], ' ');
  }

  // 3. Maintenance Fee: 'maintainance 1000', '1000 maintence'
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

  // 4. Advance / Refundable Deposit: '1000 refundable', 'refundable 1000', 'adv 2000'
  let advAmount = 0;
  const refBefore = cleaned.match(/(\d+(?:\.\d+)?)(k)?\s*(?:refun[a-z]*|security\s*deposit|sec\s*deposit|deposit|adv|advance|advan[cv]e)\b/i);
  if (refBefore) {
    advAmount = parseFloat(refBefore[1]) * (refBefore[2] ? 1000 : 1);
    cleaned = cleaned.replace(refBefore[0], ' ');
  } else {
    const refAfter = cleaned.match(/\b(?:refun[a-z]*\s*(?:ammount|amount|deposit|fee)?|security\s*deposit|sec\s*deposit|deposit|adv|advance|advan[cv]e)\s*[:=]?\s*(\d+(?:\.\d+)?)(k)?\b/i);
    if (refAfter) {
      advAmount = parseFloat(refAfter[1]) * (refAfter[2] ? 1000 : 1);
      cleaned = cleaned.replace(refAfter[0], ' ');
    }
  }

  // 5. Room Fee / Rent / Paid: 'paid 500' or '500 paid' or 'rent 5000'
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

  // 6. Standalone 2-3 digit number (if room wasn't caught earlier)
  if (!roomNumber) {
    const standaloneRoom = cleaned.match(/\b([1-9]\d{1,2})\b/);
    if (standaloneRoom) {
      roomNumber = standaloneRoom[1];
      cleaned = cleaned.replace(standaloneRoom[0], ' ');
    }
  }

  // 7. Any remaining number
  const remainingNumbers = cleaned.match(/\b\d+(?:\.\d+)?(?:k)?\b/g);
  if (remainingNumbers) {
    for (const nStr of remainingNumbers) {
      const parsed = parseFloat(nStr) * (nStr.includes('k') ? 1000 : 1);
      // Exclude calendar years (2020-2035)
      if (parsed >= 2020 && parsed <= 2035 && !nStr.toLowerCase().includes('k')) {
        continue;
      }
      if (feeAmount === 0 && (!monthPayments || monthPayments.length === 0)) {
        feeAmount = parsed;
      } else if (advAmount === 0 && !lower.includes('due')) {
        advAmount = parsed;
      }
      cleaned = cleaned.replace(nStr, ' ');
    }
  }

  // 6. Name
  const noiseWords = [
    'rom', 'romm', 'room', 'rroom', 'rooom', 'rrom', 'rooomm', 'rm',
    'fee', 'feee', 'rent', 'ent', 'ren', 'rnt', 'reent', 'rrent', 'remt',
    'and', '&', 'paid', 'sent', 'adv', 'advance', 'due', 'dues', 'overdue', 'pending', 'clear', 'cleared', 'settle', 'settled', 'balance', 'for', 'of', 'pg',
    'record', 'payment', 'payments', 'paymnet', 'paymnets', 'full', 'month', 'months', 'every',
    'maintainance', 'maintenance', 'maintance', 'maintence', 'maintanace', 'maintanance', 'maintanence', 'maint',
    'refundable', 'refundabale', 'refundble', 'ammount', 'amount',
    'revenue', 'on', 'date', 'joined', 'joining', 'join', 'guest', 'tenant', 'resident', 'name', 'called', 'named', 'please', 'the', 'a', 'an',
    'jan', 'january', 'feb', 'february', 'mar', 'march', 'apr', 'april', 'may', 'jun', 'june',
    'jul', 'july', 'aug', 'august', 'sep', 'september', 'oct', 'october', 'nov', 'november', 'dec', 'december'
  ];
  const nameTokens = cleaned.split(/\s+/).filter(w =>
    w &&
    !noiseWords.includes(w) &&
    !isNoiseToken(w) &&
    !w.startsWith('maint') &&
    !w.startsWith('ment') &&
    !w.startsWith('refun') &&
    !w.startsWith('paym') &&
    !w.startsWith('payn') &&
    !/^\d+(?:st|nd|rd|th)?$/i.test(w)
  );
  const tenantName = nameTokens.join(' ').trim();

  const totalCalculated = feeAmount + advAmount + maintenanceFee + monthPayments.reduce((s, m) => s + m.amount, 0);

  return {
    type: 'revenue' as const,
    roomNumber,
    tenantName,
    feeAmount,
    advAmount,
    maintenanceFee,
    monthPayments: monthPayments.length > 0 ? monthPayments : undefined,
    totalAmount: totalCalculated,
    paymentDate: customDate
  };
}
