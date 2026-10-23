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
    it('should parse "curd 165" as expense automatically without typing expences', () => {
      const result = parseQuickLedgerText('curd 165');
      expect(result.type).toBe('expense');
      expect(result.items!.length).toBe(1);
      expect(result.items![0].amount).toBe(165);
      expect(result.items![0].description.toLowerCase()).toContain('curd');
      expect(result.items![0].category).toBe('Food');
    });
  });

  describe('Revenue Parsing', () => {
    it('should parse "karunkar 204 paid 500"', () => {
      const result = parseQuickLedgerText('karunkar 204 paid 500');
      expect(result.type).toBe('revenue');
      expect(result.roomNumber).toBe('204');
      expect(result.tenantName?.toLowerCase()).toBe('karunkar');
      expect(result.feeAmount).toBe(500);
      expect(result.totalAmount).toBe(500);
    });
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

  describe('Tenant Admission / Assign Parsing', () => {
    it('should parse "assign ravi room 201 rent 8000 adv 2000"', () => {
      const result = parseQuickLedgerText('assign ravi room 201 rent 8000 adv 2000');
      expect(result.type).toBe('assign');
      if (result.type === 'assign') {
        expect(result.tenantName.toLowerCase()).toBe('ravi');
        expect(result.roomNumber).toBe('201');
        expect(result.monthlyRent).toBe(8000);
        expect(result.advAmount).toBe(2000);
      }
    });

    it('should parse "new tenant rahul room 302 rent 9000 adv 2000"', () => {
      const result = parseQuickLedgerText('new tenant rahul room 302 rent 9000 adv 2000');
      expect(result.type).toBe('assign');
      if (result.type === 'assign') {
        expect(result.tenantName.toLowerCase()).toBe('rahul');
        expect(result.roomNumber).toBe('302');
        expect(result.monthlyRent).toBe(9000);
        expect(result.advAmount).toBe(2000);
      }
    });

    it('should parse "add akshith to room 204"', () => {
      const result = parseQuickLedgerText('add akshith to room 204');
      expect(result.type).toBe('assign');
      if (result.type === 'assign') {
        expect(result.tenantName.toLowerCase()).toBe('akshith');
        expect(result.roomNumber).toBe('204');
        expect(result.monthlyRent).toBe(0);
        expect(result.advAmount).toBe(0);
      }
    });

    it('should parse "assign sathish 101 rent 7500 adv 1500 due 28"', () => {
      const result = parseQuickLedgerText('assign sathish 101 rent 7500 adv 1500 due 28');
      expect(result.type).toBe('assign');
      if (result.type === 'assign') {
        expect(result.tenantName.toLowerCase()).toBe('sathish');
        expect(result.roomNumber).toBe('101');
        expect(result.monthlyRent).toBe(7500);
        expect(result.advAmount).toBe(1500);
        expect(result.dueDay).toBe(28);
      }
    });
  });
});
