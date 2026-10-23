import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseQuickLedgerText } from '@/lib/quick-ledger-parser';

describe('Quick Ledger NLP Parser', () => {
  describe('Expense Parsing', () => {
    it('should parse multi-item expense from "expences 700 vegitbales 200 oil 800 varalakshmi traders"', () => {
      const result = parseQuickLedgerText('expences 700 vegitbales 200 oil 800 varalakshmi traders');
      expect(result.type).toBe('expense');
      expect(result.items).toBeDefined();
      expect(result.items!.length).toBe(3);

      expect(result.items![0].amount).toBe(700);
      expect(result.items![0].description.toLowerCase()).toContain('vegitbale');
      expect(result.items![0].category).toBe('Food');

      expect(result.items![1].amount).toBe(200);
      expect(result.items![1].description.toLowerCase()).toContain('oil');
      expect(result.items![1].category).toBe('Food');

      expect(result.items![2].amount).toBe(800);
      expect(result.items![2].description.toLowerCase()).toContain('varalakshmi traders');
      expect(result.items![2].category).toBe('Food');
    });

    it('should parse single expense "water tanker expences 22000"', () => {
      const result = parseQuickLedgerText('water tanker expences 22000');
      expect(result.type).toBe('expense');
      expect(result.items!.length).toBe(1);
      expect(result.items![0].amount).toBe(22000);
      expect(result.items![0].description.toLowerCase()).toContain('water tanker');
      expect(result.items![0].category).toBe('Utilities');
    });

    it('should parse staff salary "cleaner ramesh salary 8000 expences"', () => {
      const result = parseQuickLedgerText('cleaner ramesh salary 8000 expences');
      expect(result.type).toBe('expense');
      expect(result.items!.length).toBe(1);
      expect(result.items![0].amount).toBe(8000);
      expect(result.items![0].category).toBe('Staff');
    });
  });

  describe('Revenue Parsing', () => {
    it('should parse room fee and advance "sathish 101 5000 rom fee and 2000 adv paid"', () => {
      const result = parseQuickLedgerText('sathish 101 5000 rom fee and 2000 adv paid');
      expect(result.type).toBe('revenue');
      expect(result.roomNumber).toBe('101');
      expect(result.tenantName?.toLowerCase()).toContain('sathish');
      expect(result.feeAmount).toBe(5000);
      expect(result.advAmount).toBe(2000);
      expect(result.totalAmount).toBe(7000);
    });

    it('should parse "revenue room 103 kiran 10000"', () => {
      const result = parseQuickLedgerText('revenue room 103 kiran 10000');
      expect(result.type).toBe('revenue');
      expect(result.roomNumber).toBe('103');
      expect(result.tenantName?.toLowerCase()).toContain('kiran');
      expect(result.feeAmount).toBe(10000);
      expect(result.advAmount).toBe(0);
      expect(result.totalAmount).toBe(10000);
    });

    it('should parse "sathish 7000 Pg feee"', () => {
      const result = parseQuickLedgerText('sathish 7000 Pg feee');
      expect(result.type).toBe('revenue');
      expect(result.tenantName?.toLowerCase()).toContain('sathish');
      expect(result.feeAmount).toBe(7000);
      expect(result.totalAmount).toBe(7000);
    });
  });
});
