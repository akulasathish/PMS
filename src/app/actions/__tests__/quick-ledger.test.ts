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

    it('should parse backdated payment "srikanth rom 201 paid 9000 on 1st"', () => {
      const result = parseQuickLedgerText('srikanth rom 201 paid 9000 on 1st');
      expect(result.type).toBe('revenue');
      expect(result.roomNumber).toBe('201');
      expect(result.tenantName?.toLowerCase()).toContain('srikanth');
      expect(result.feeAmount).toBe(9000);
      expect(result.paymentDate).toMatch(/\d{4}-\d{2}-01/);
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

    it('should parse "add srikanth to room 201 3 share 9000 room fee and 2k advanve"', () => {
      const result = parseQuickLedgerText('add srikanth to room 201 3 share 9000 room fee and 2k advanve');
      expect(result.type).toBe('assign');
      if (result.type === 'assign') {
        expect(result.tenantName.toLowerCase()).toBe('srikanth');
        expect(result.roomNumber).toBe('201');
        expect(result.monthlyRent).toBe(9000);
        expect(result.advAmount).toBe(2000);
        expect(result.sharing).toBe(3);
      }
    });

    it('should parse "add srikanth 3 share 9000 room fee and 2k advanve"', () => {
      const result = parseQuickLedgerText('add srikanth 3 share 9000 room fee and 2k advanve');
      expect(result.type).toBe('assign');
      if (result.type === 'assign') {
        expect(result.tenantName.toLowerCase()).toBe('srikanth');
        expect(result.monthlyRent).toBe(9000);
        expect(result.advAmount).toBe(2000);
        expect(result.sharing).toBe(3);
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

    it('should parse user example "201 srikanth 9000 joined on 1st october 1000 maintainance and 1500 refundable ammount"', () => {
      const result = parseQuickLedgerText('201 srikanth 9000 joined on 1st october 1000 maintainance and 1500 refundable ammount');
      expect(result.type).toBe('assign');
      if (result.type === 'assign') {
        expect(result.tenantName.toLowerCase()).toBe('srikanth');
        expect(result.roomNumber).toBe('201');
        expect(result.monthlyRent).toBe(9000);
        expect(result.maintenanceFee).toBe(1000);
        expect(result.refundableDeposit).toBe(1500);
        expect(result.checkInDate).toMatch(/\d{4}-10-01/);
        expect(result.dueDay).toBe(1);
      }
    });

    it('should parse user daily stay example "kiran joined/add to room 204 daily basis per day 600 total 2 days paid only for 1 day 600 pedning 600"', () => {
      const result = parseQuickLedgerText('kiran joined/add to room 204 daily basis per day 600 total 2 days paid only for 1 day 600 pedning 600');
      expect(result.type).toBe('assign');
      if (result.type === 'assign') {
        expect(result.tenantName.toLowerCase()).toBe('kiran');
        expect(result.roomNumber).toBe('204');
        expect((result as any).isDaily).toBe(true);
        expect((result as any).stayDays).toBe(2);
        expect((result as any).perDayRate).toBe(600);
        expect((result as any).totalAmount).toBe(1200);
        expect((result as any).paidAmount).toBe(600);
      }
    });

    it('should parse short daily stay "guest rajesh room 201 3 days 1500 paid"', () => {
      const result = parseQuickLedgerText('guest rajesh room 201 3 days 1500 paid');
      expect(result.type).toBe('assign');
      if (result.type === 'assign') {
        expect(result.tenantName.toLowerCase()).toBe('rajesh');
        expect(result.roomNumber).toBe('201');
        expect((result as any).isDaily).toBe(true);
        expect((result as any).stayDays).toBe(3);
        expect((result as any).totalAmount).toBe(1500);
        expect((result as any).paidAmount).toBe(1500);
      }
    });
  });

  describe('Pending Dues Report Parsing', () => {
    it('should parse "i need report of pending dues"', () => {
      const result = parseQuickLedgerText('i need report of pending dues');
      expect(result.type).toBe('dues_report');
    });

    it('should parse "pending dues report"', () => {
      const result = parseQuickLedgerText('pending dues report');
      expect(result.type).toBe('dues_report');
    });

    it('should parse "who has pending dues"', () => {
      const result = parseQuickLedgerText('who has pending dues');
      expect(result.type).toBe('dues_report');
    });

    it('should parse simple "pending dues"', () => {
      const result = parseQuickLedgerText('pending dues');
      expect(result.type).toBe('dues_report');
    });
  });

  describe('Today Summary / History Parsing', () => {
    it('should parse "today history"', () => {
      const result = parseQuickLedgerText('today history');
      expect(result.type).toBe('today_summary');
    });

    it('should parse "today summary"', () => {
      const result = parseQuickLedgerText('today summary');
      expect(result.type).toBe('today_summary');
    });

    it('should parse "what did i log today"', () => {
      const result = parseQuickLedgerText('what did i log today');
      expect(result.type).toBe('today_summary');
    });

    it('should parse "today ledger"', () => {
      const result = parseQuickLedgerText('today ledger');
      expect(result.type).toBe('today_summary');
    });
  });

  describe('Update Tenant / Change Dates & Rent Parsing', () => {
    it('should parse "change joining date of srikanth room 201 to 1st october"', () => {
      const result = parseQuickLedgerText('change joining date of srikanth room 201 to 1st october');
      expect(result.type).toBe('update_tenant');
      if (result.type === 'update_tenant') {
        expect(result.roomNumber).toBe('201');
        expect(result.tenantName?.toLowerCase()).toContain('srikanth');
        expect(result.newCheckInDate).toMatch(/\d{4}-10-01/);
      }
    });

    it('should parse "change due date of room 201 to 10th"', () => {
      const result = parseQuickLedgerText('change due date of room 201 to 10th');
      expect(result.type).toBe('update_tenant');
      if (result.type === 'update_tenant') {
        expect(result.roomNumber).toBe('201');
        expect(result.newDueDay).toBe(10);
      }
    });

    it('should parse "change joining date to 1st and due date to 10th for room 201 srikanth"', () => {
      const result = parseQuickLedgerText('change joining date to 1st and due date to 10th for room 201 srikanth');
      expect(result.type).toBe('update_tenant');
      if (result.type === 'update_tenant') {
        expect(result.roomNumber).toBe('201');
        expect(result.tenantName?.toLowerCase()).toContain('srikanth');
        expect(result.newCheckInDate).toMatch(/\d{4}-\d{2}-01/);
        expect(result.newDueDay).toBe(10);
      }
    });

    it('should parse "change rent of room 201 to 8500"', () => {
      const result = parseQuickLedgerText('change rent of room 201 to 8500');
      expect(result.type).toBe('update_tenant');
      if (result.type === 'update_tenant') {
        expect(result.roomNumber).toBe('201');
        expect(result.newMonthlyRent).toBe(8500);
      }
    });
  });
});
