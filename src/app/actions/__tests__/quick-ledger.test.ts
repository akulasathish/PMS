import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseQuickLedgerText, isResidentNameMatch } from '@/lib/quick-ledger-parser';

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

    it('should parse "grociers 2500" and "grocery 1800" as Food expense', () => {
      const r1 = parseQuickLedgerText('grociers 2500');
      expect(r1.type).toBe('expense');
      expect(r1.items![0].amount).toBe(2500);
      expect(r1.items![0].category).toBe('Food');

      const r2 = parseQuickLedgerText('grocery 1800');
      expect(r2.type).toBe('expense');
      expect(r2.items![0].amount).toBe(1800);
      expect(r2.items![0].category).toBe('Food');
    });

    it('should parse comma-separated grocery items "vegetables 700, oil 200, rice 800"', () => {
      const result = parseQuickLedgerText('vegetables 700, oil 200, rice 800');
      expect(result.type).toBe('expense');
      expect(result.items!.length).toBe(3);
      expect(result.items![0].amount).toBe(700);
      expect(result.items![0].category).toBe('Food');
      expect(result.items![1].amount).toBe(200);
      expect(result.items![1].category).toBe('Food');
      expect(result.items![2].amount).toBe(800);
      expect(result.items![2].category).toBe('Food');
    });

    it('should parse PG utility expenses like "current bill 15000" and "wifi 1200"', () => {
      const r1 = parseQuickLedgerText('current bill 15000');
      expect(r1.type).toBe('expense');
      expect(r1.items![0].amount).toBe(15000);
      expect(r1.items![0].category).toBe('Utilities');

      const r2 = parseQuickLedgerText('wifi 1200');
      expect(r2.type).toBe('expense');
      expect(r2.items![0].amount).toBe(1200);
      expect(r2.items![0].category).toBe('Utilities');
    });

    it('should parse maintenance expenses like "carpenter 800" and "pest control 1500"', () => {
      const r1 = parseQuickLedgerText('carpenter 800');
      expect(r1.type).toBe('expense');
      expect(r1.items![0].amount).toBe(800);
      expect(r1.items![0].category).toBe('Maintenance');

      const r2 = parseQuickLedgerText('pest control 1500');
      expect(r2.type).toBe('expense');
      expect(r2.items![0].amount).toBe(1500);
      expect(r2.items![0].category).toBe('Maintenance');
    });

    it('should parse cleaning supplies "harpic 250, mop 150, broom 100"', () => {
      const result = parseQuickLedgerText('harpic 250, mop 150, broom 100');
      expect(result.type).toBe('expense');
      expect(result.items!.length).toBe(3);
      expect(result.items![0].amount).toBe(250);
      expect(result.items![0].category).toBe('Laundry');
      expect(result.items![1].amount).toBe(150);
      expect(result.items![2].amount).toBe(100);
    });

    it('should parse multi-category expenses "current bill 12000, water tanker 2500, cook salary 10000"', () => {
      const result = parseQuickLedgerText('current bill 12000, water tanker 2500, cook salary 10000');
      expect(result.type).toBe('expense');
      expect(result.items!.length).toBe(3);
      expect(result.items![0].amount).toBe(12000);
      expect(result.items![0].category).toBe('Utilities');
      expect(result.items![1].amount).toBe(2500);
      expect(result.items![1].category).toBe('Utilities');
      expect(result.items![2].amount).toBe(10000);
      expect(result.items![2].category).toBe('Staff');
    });

    it('should parse verb-based expense "spent 500 on auto"', () => {
      const result = parseQuickLedgerText('spent 500 on auto');
      expect(result.type).toBe('expense');
      expect(result.items![0].amount).toBe(500);
      expect(result.items![0].description.toLowerCase()).toContain('auto');
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

    it('should parse backdated maintenance fee "danush room 202 paid maintainance 1000 on 1st june"', () => {
      const result = parseQuickLedgerText('danush room 202 paid maintainance 1000 on 1st june');
      expect(result.type).toBe('revenue');
      expect(result.roomNumber).toBe('202');
      expect(result.tenantName?.toLowerCase()).toContain('danush');
      expect((result as any).maintenanceFee).toBe(1000);
      expect(result.paymentDate).toMatch(/\d{4}-06-01/);
    });

    it('should parse multi-month and overdue payment "record a payment of danush over due ammount of 2000 of september month and full paymnet for october"', () => {
      const result = parseQuickLedgerText('record a payment of danush over due ammount of 2000 of september month and full paymnet for october');
      expect(result.type).toBe('revenue');
      expect(result.tenantName?.toLowerCase()).toBe('danush');
      expect((result as any).monthPayments).toBeDefined();
      expect((result as any).monthPayments.length).toBe(2);
      expect((result as any).monthPayments[0].month).toBe('September');
      expect((result as any).monthPayments[0].amount).toBe(2000);
      expect((result as any).monthPayments[0].isOverdue).toBe(true);
      expect((result as any).monthPayments[1].month).toBe('October');
      expect((result as any).monthPayments[1].isFullPayment).toBe(true);
    });

    it('should parse month-first date "raghu room 203 paid 1000 maintainance and 1000 refundable on september 1st 2026"', () => {
      const result = parseQuickLedgerText('raghu room 203 paid 1000 maintainance and 1000 refundable on september 1st 2026');
      expect(result.type).toBe('revenue');
      expect(result.tenantName?.toLowerCase()).toBe('raghu');
      expect(result.roomNumber).toBe('203');
      expect((result as any).maintenanceFee).toBe(1000);
      expect((result as any).advAmount).toBe(1000);
      expect(result.paymentDate).toBe('2026-09-01');
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
        expect(result.checkInDate).toBe('2026-10-01');
        expect(result.dueDay).toBe(1);
      }
    });

    it('should not leak date words into tenantName or use year 2026 as deposit for "add srikanth room 201 date 1st paid 1st october 2026"', () => {
      const result = parseQuickLedgerText('add srikanth room 201 date 1st paid 1st october 2026');
      expect(result.type).toBe('assign');
      if (result.type === 'assign') {
        expect(result.tenantName.toLowerCase()).toBe('srikanth');
        expect(result.roomNumber).toBe('201');
        expect(result.checkInDate).toBe('2026-10-01');
        expect(result.refundableDeposit).toBe(0); // 2026 should not be parsed as deposit
      }
    });

    it('should parse user slash date example "srikanth room 201 joined 10/05/26 due dat is 1st paid 8500 room fee on 1st"', () => {
      const result = parseQuickLedgerText('srikanth room 201 joined 10/05/26 due dat is 1st paid 8500 room fee on 1st');
      expect(result.type).toBe('assign');
      if (result.type === 'assign') {
        expect(result.tenantName.toLowerCase()).toBe('srikanth');
        expect(result.roomNumber).toBe('201');
        expect(result.checkInDate).toBe('2026-05-10');
        expect(result.dueDay).toBe(1);
        expect(result.monthlyRent).toBe(8500);
        expect((result as any).rentPaid).toBe(8500);
      }
    });

    it('should parse rent paid upon admission "202 ponnam shanker paid 9000 room fee maintainance 1000"', () => {
      const result = parseQuickLedgerText('202 ponnam shanker paid 9000 room fee maintainance 1000');
      expect(result.type).toBe('assign');
      if (result.type === 'assign') {
        expect(result.tenantName.toLowerCase()).toBe('ponnam shanker');
        expect(result.roomNumber).toBe('202');
        expect(result.monthlyRent).toBe(9000);
        expect((result as any).rentPaid).toBe(9000);
        expect(result.maintenanceFee).toBe(1000);
      }
    });

    it('should correctly parse user command with typos "add danush in 202 joined on 01/06/26 due date 1st romm fee paid 9000 maintence 1000 refundable amount 1000"', () => {
      const result = parseQuickLedgerText('add danush in 202 joined on 01/06/26 due date 1st romm fee paid 9000 maintence 1000 refundable amount 1000');
      expect(result.type).toBe('assign');
      if (result.type === 'assign') {
        expect(result.tenantName.toLowerCase()).toBe('danush');
        expect(result.roomNumber).toBe('202');
        expect(result.checkInDate).toBe('2026-06-01');
        expect(result.dueDay).toBe(1);
        expect(result.monthlyRent).toBe(9000);
        expect((result as any).rentPaid).toBe(9000);
        expect(result.maintenanceFee).toBe(1000);
        expect(result.refundableDeposit).toBe(1000);
      }
    });

    it('should parse "add danush to room 202 joined on 01/06/26 due date is 1st of every month october room fee paid 9000 maintence 1000 and refundable 1000 paid on june 1st 2026"', () => {
      const result = parseQuickLedgerText('add danush to room 202 joined on 01/06/26 due date is 1st of every month october room fee paid 9000 maintence 1000 and refundable 1000 paid on june 1st 2026');
      expect(result.type).toBe('assign');
      if (result.type === 'assign') {
        expect(result.tenantName.toLowerCase()).toBe('danush');
        expect(result.roomNumber).toBe('202');
        expect(result.checkInDate).toBe('2026-06-01');
        expect(result.dueDay).toBe(1);
        expect(result.monthlyRent).toBe(9000);
        expect((result as any).rentPaid).toBe(9000);
        expect(result.maintenanceFee).toBe(1000);
        expect(result.refundableDeposit).toBe(1000);
      }
    });

    it('should parse "add raghu in 203 joined 24th october due date 29th room fee paid 9000 maintence 1000 refundable 1000"', () => {
      const result = parseQuickLedgerText('add raghu in 203 joined 24th october due date 29th room fee paid 9000 maintence 1000 refundable 1000');
      expect(result.type).toBe('assign');
      if (result.type === 'assign') {
        expect(result.tenantName.toLowerCase()).toBe('raghu');
        expect(result.roomNumber).toBe('203');
        expect(result.checkInDate).toBe('2026-10-24');
        expect(result.dueDay).toBe(29);
        expect(result.monthlyRent).toBe(9000);
        expect((result as any).rentPaid).toBe(9000);
        expect(result.maintenanceFee).toBe(1000);
        expect(result.refundableDeposit).toBe(1000);
      }
    });

    it('should parse "add sai ganesh to room 205 joining date 1st september refundable ammount paid 1000 and maintainance ammount paid 1000 on september room fee 8000 paid only 5000"', () => {
      const result = parseQuickLedgerText('add sai ganesh to room 205 joining date 1st september refundable ammount paid 1000 and maintainance ammount paid 1000 on september room fee 8000 paid only 5000');
      expect(result.type).toBe('assign');
      if (result.type === 'assign') {
        expect(result.tenantName.toLowerCase()).toBe('sai ganesh');
        expect(result.roomNumber).toBe('205');
        expect(result.checkInDate).toBe('2026-09-01');
        expect(result.monthlyRent).toBe(8000);
        expect((result as any).rentPaid).toBe(5000);
        expect(result.maintenanceFee).toBe(1000);
        expect(result.refundableDeposit).toBe(1000);
      }
    });

    it('should parse comma-separated join with all paid: "join sathish to room 201, joined on 1st october 2026, due date 5th, refundable ammount paid 1000, maintainance paid 1000, room fee paid 8000"', () => {
      const result = parseQuickLedgerText('join sathish to room 201, joined on 1st october 2026, due date 5th, refundable ammount paid 1000, maintainance paid 1000, room fee paid 8000');
      expect(result.type).toBe('assign');
      if (result.type === 'assign') {
        expect(result.tenantName.toLowerCase()).toBe('sathish');
        expect(result.roomNumber).toBe('201');
        expect(result.checkInDate).toBe('2026-10-01');
        expect(result.dueDay).toBe(5);
        expect(result.monthlyRent).toBe(8000);
        expect((result as any).rentPaid).toBe(8000);
        expect(result.maintenanceFee).toBe(1000);
        expect((result as any).maintenancePaid).toBe(1000);
        expect(result.refundableDeposit).toBe(1000);
        expect((result as any).depositPaid).toBe(1000);
      }
    });

    it('should parse comma-separated join with all due: "join sathish to room 201, joined on 1st october 2026, due date 5th, refundable ammount due 1000, maintanance 1000 due, room fee due 8000"', () => {
      const result = parseQuickLedgerText('join sathish to room 201, joined on 1st october 2026, due date 5th, refundable ammount due 1000, maintanance 1000 due, room fee due 8000');
      expect(result.type).toBe('assign');
      if (result.type === 'assign') {
        expect(result.tenantName.toLowerCase()).toBe('sathish');
        expect(result.roomNumber).toBe('201');
        expect(result.checkInDate).toBe('2026-10-01');
        expect(result.dueDay).toBe(5);
        expect(result.monthlyRent).toBe(8000);
        expect((result as any).rentPaid).toBe(0);
        expect(result.maintenanceFee).toBe(1000);
        expect((result as any).maintenancePaid).toBe(0);
        expect(result.refundableDeposit).toBe(1000);
        expect((result as any).depositPaid).toBe(0);
      }
    });

    it('should parse paid only 1000 with room fee due "202 ponnam shanker total fee 9000 maintainance 1000 paid but paid only 1000 non refundable room fee and 1000 maintance due"', () => {
      const result = parseQuickLedgerText('202 ponnam shanker total fee 9000 maintainance 1000 paid but paid only 1000 non refundable room fee and 1000 maintance due');
      expect(result.type).toBe('assign');
      if (result.type === 'assign') {
        expect(result.tenantName.toLowerCase()).toBe('ponnam shanker');
        expect(result.roomNumber).toBe('202');
        expect(result.monthlyRent).toBe(9000);
        expect((result as any).rentPaid).toBe(0); // Rent is due
        expect(result.maintenanceFee).toBe(1000); // Maintenance paid
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

    it('should parse multi-date admission sentence without colliding year 2026 into rent', () => {
      const input = 'add shaikshavali to room 203 joined on 8th june 2026 maintaiance paid 1000 refundable paid 1000 on 8th june 2026 room fee for october month 7000 paid on 8th october';
      const result = parseQuickLedgerText(input);
      expect(result.type).toBe('assign');
      if (result.type === 'assign') {
        expect(result.tenantName.toLowerCase()).toBe('shaikshavali');
        expect(result.roomNumber).toBe('203');
        expect(result.monthlyRent).toBe(7000);
        expect(result.rentPaid).toBe(7000);
        expect(result.maintenanceFee).toBe(1000);
        expect(result.refundableDeposit).toBe(1000);
        expect(result.checkInDate).toBe('2026-06-08');
        expect(result.dueDay).toBe(8);
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

  describe('Individual Tenant Report / Statement Parsing', () => {
    it('should parse "report of srikanth 201"', () => {
      const result = parseQuickLedgerText('report of srikanth 201');
      expect(result.type).toBe('tenant_report');
      expect((result as any).tenantName.toLowerCase()).toBe('srikanth');
      expect((result as any).roomNumber).toBe('201');
    });

    it('should parse "srikanth 201 report"', () => {
      const result = parseQuickLedgerText('srikanth 201 report');
      expect(result.type).toBe('tenant_report');
      expect((result as any).tenantName.toLowerCase()).toBe('srikanth');
      expect((result as any).roomNumber).toBe('201');
    });

    it('should parse "how much did srikanth pay"', () => {
      const result = parseQuickLedgerText('how much did srikanth pay');
      expect(result.type).toBe('tenant_report');
      expect((result as any).tenantName.toLowerCase()).toBe('srikanth');
    });

    it('should parse "dues of srikanth 201"', () => {
      const result = parseQuickLedgerText('dues of srikanth 201');
      expect(result.type).toBe('tenant_report');
      expect((result as any).tenantName.toLowerCase()).toBe('srikanth');
      expect((result as any).roomNumber).toBe('201');
    });

    it('should parse "statement of room 201"', () => {
      const result = parseQuickLedgerText('statement of room 201');
      expect(result.type).toBe('tenant_report');
      expect((result as any).roomNumber).toBe('201');
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

    it('should parse "change due date of 204 akshith to 10th"', () => {
      const result = parseQuickLedgerText('change due date of 204 akshith to 10th');
      expect(result.type).toBe('update_tenant');
      if (result.type === 'update_tenant') {
        expect(result.roomNumber).toBe('204');
        expect(result.tenantName?.toLowerCase()).toContain('akshith');
        expect(result.newDueDay).toBe(10);
      }
    });

    it('should parse "akshith wants to change his due date to 10th"', () => {
      const result = parseQuickLedgerText('akshith wants to change his due date to 10th');
      expect(result.type).toBe('update_tenant');
      if (result.type === 'update_tenant') {
        expect(result.tenantName?.toLowerCase()).toBe('akshith');
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

    it('should parse full modify command "please modify existing tenant room 201 srikanth joining date 1st may 2026 fee 8500 paid maintainance 1000 and refundabale 1000"', () => {
      const result = parseQuickLedgerText('please modify existing tenant room 201 srikanth joining date 1st may 2026 fee 8500 paid maintainance 1000 and refundabale 1000');
      expect(result.type).toBe('update_tenant');
      if (result.type === 'update_tenant') {
        expect(result.roomNumber).toBe('201');
        expect(result.tenantName?.toLowerCase()).toBe('srikanth');
        expect(result.newCheckInDate).toBe('2026-05-01');
        expect(result.newMonthlyRent).toBe(8500);
        expect((result as any).newMaintenanceFee).toBe(1000);
        expect((result as any).newRefundableDeposit).toBe(1000);
        expect((result as any).isPaid).toBe(true);
      }
    });
  });

  describe('Checkout / Vacate Tenant Parsing', () => {
    it('should parse user request "please checkout guest srikanth from room 201"', () => {
      const result = parseQuickLedgerText('please checkout guest srikanth from room 201');
      expect(result.type).toBe('checkout');
      if (result.type === 'checkout') {
        expect(result.roomNumber).toBe('201');
        expect(result.tenantName?.toLowerCase()).toBe('srikanth');
        expect(result.isForce).toBe(false);
      }
    });

    it('should parse "force checkout srikanth room 201"', () => {
      const result = parseQuickLedgerText('force checkout srikanth room 201');
      expect(result.type).toBe('checkout');
      if (result.type === 'checkout') {
        expect(result.roomNumber).toBe('201');
        expect(result.tenantName?.toLowerCase()).toBe('srikanth');
        expect(result.isForce).toBe(true);
      }
    });

    it('should parse "checkout room 201"', () => {
      const result = parseQuickLedgerText('checkout room 201');
      expect(result.type).toBe('checkout');
      if (result.type === 'checkout') {
        expect(result.roomNumber).toBe('201');
        expect(result.tenantName).toBeUndefined();
        expect(result.isForce).toBe(false);
      }
    });

    it('should parse "vacate srikanth 201"', () => {
      const result = parseQuickLedgerText('vacate srikanth 201');
      expect(result.type).toBe('checkout');
      if (result.type === 'checkout') {
        expect(result.roomNumber).toBe('201');
        expect(result.tenantName?.toLowerCase()).toBe('srikanth');
        expect(result.isForce).toBe(false);
      }
    });

    it('should parse "checkout tenant name called srikanth from room 201"', () => {
      const result = parseQuickLedgerText('checkout tenant name called srikanth from room 201');
      expect(result.type).toBe('checkout');
      if (result.type === 'checkout') {
        expect(result.roomNumber).toBe('201');
        expect(result.tenantName?.toLowerCase()).toBe('srikanth');
        expect(result.isForce).toBe(false);
      }
    });

    it('should parse "force checkout srikant room 201"', () => {
      const result = parseQuickLedgerText('force checkout srikant room 201');
      expect(result.type).toBe('checkout');
      if (result.type === 'checkout') {
        expect(result.roomNumber).toBe('201');
        expect(result.tenantName?.toLowerCase()).toBe('srikant');
        expect(result.isForce).toBe(true);
      }
    });
  });

  describe('Resident Name Matching & Isolation', () => {
    it('should match Srikanth with srikanth and typo srikant', () => {
      expect(isResidentNameMatch('Srikanth', 'srikanth')).toBe(true);
      expect(isResidentNameMatch('Srikanth', 'srikant')).toBe(true);
      expect(isResidentNameMatch('Srikanth', 'shrikanth')).toBe(true);
      expect(isResidentNameMatch('Srikanth Reddy', 'srikanth')).toBe(true);
      expect(isResidentNameMatch('Srikanth', 'tenant name called srikanth')).toBe(true);
    });

    it('should NEVER match Narayana when searching for Srikanth or srikant', () => {
      expect(isResidentNameMatch('Narayana', 'srikanth')).toBe(false);
      expect(isResidentNameMatch('Narayana', 'srikant')).toBe(false);
      expect(isResidentNameMatch('Narayana', 'shrikanth')).toBe(false);
      expect(isResidentNameMatch('Narayana', 'tenant name called srikanth')).toBe(false);
    });

    it('should match other residents accurately', () => {
      expect(isResidentNameMatch('Ponnam Shanker', 'shanker')).toBe(true);
      expect(isResidentNameMatch('Ponnam Shanker', 'shankar')).toBe(true);
      expect(isResidentNameMatch('Ponnam Shanker', 'ponnam')).toBe(true);
      expect(isResidentNameMatch('Narayana', 'narayana')).toBe(true);
      expect(isResidentNameMatch('Danush Romm Maintence', 'danush')).toBe(true);
      expect(isResidentNameMatch('Danush Of Every Month', 'danush')).toBe(true);
      expect(isResidentNameMatch('Danush', 'danush')).toBe(true);
    });

    it('should ignore noise typos like rroom ent and strip them cleanly from resident names', () => {
      const parsed1 = parseQuickLedgerText('join Srikanth rroom ent to room 201');
      expect(parsed1.type).toBe('assign');
      if (parsed1.type === 'assign') {
        expect(parsed1.tenantName?.toLowerCase()).toBe('srikanth');
        expect(parsed1.roomNumber).toBe('201');
      }

      const parsed2 = parseQuickLedgerText('report of srikanth rroom ent 201');
      expect(parsed2.type).toBe('tenant_report');
      if (parsed2.type === 'tenant_report') {
        expect(parsed2.tenantName?.toLowerCase()).toBe('srikanth');
        expect(parsed2.roomNumber).toBe('201');
      }

      const parsed3 = parseQuickLedgerText('checkout srikanth rroom ent room 201');
      expect(parsed3.type).toBe('checkout');
      if (parsed3.type === 'checkout') {
        expect(parsed3.tenantName?.toLowerCase()).toBe('srikanth');
      }
    });

    it('should cleanly parse overdue rent clearance like "301 sathish 1000 sep month due cleared" without noise', () => {
      const p1 = parseQuickLedgerText('301 sathish 1000 sep month due cleared');
      expect(p1.type).toBe('revenue');
      if (p1.type === 'revenue') {
        expect(p1.roomNumber).toBe('301');
        expect(p1.tenantName).toBe('sathish');
        expect(p1.monthPayments).toBeDefined();
        expect(p1.monthPayments?.[0]).toEqual({
          month: 'September',
          amount: 1000,
          isOverdue: true
        });
        expect(p1.totalAmount).toBe(1000);
      }

      const p2 = parseQuickLedgerText('301 sathish 1000 sep dues cleared');
      expect(p2.type).toBe('revenue');
      if (p2.type === 'revenue') {
        expect(p2.roomNumber).toBe('301');
        expect(p2.tenantName).toBe('sathish');
        expect(p2.monthPayments?.[0].month).toBe('September');
        expect(p2.monthPayments?.[0].isOverdue).toBe(true);
      }

      const p3 = parseQuickLedgerText('301 sathish sep month 1000 due cleared');
      expect(p3.type).toBe('revenue');
      if (p3.type === 'revenue') {
        expect(p3.roomNumber).toBe('301');
        expect(p3.tenantName).toBe('sathish');
        expect(p3.monthPayments?.[0].month).toBe('September');
        expect(p3.monthPayments?.[0].amount).toBe(1000);
        expect(p3.monthPayments?.[0].isOverdue).toBe(true);
      }
    });
  });
});
