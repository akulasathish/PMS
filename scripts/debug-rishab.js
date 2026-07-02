const { createClient } = require('@supabase/supabase-js');

// Production Connection Details
const PROD_URL = "https://njblemtrkqdnijwrnvjp.supabase.co";
const PROD_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qYmxlbXRya3Fkbmlqd3JudmpwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTUyNTM4OCwiZXhwIjoyMDk1MTAxMzg4fQ.xSZmJdnzFvTjpCIwjuRHV_ABBYGvwGKe0cWutgPupSg";

const supabase = createClient(PROD_URL, PROD_KEY);

async function run() {
  console.log("=== StaySync Booking Debugger ===");
  console.log("Searching production database for guest 'Rishab'...");

  // 1. Fetch booking
  const { data: bookings, error: bookingErr } = await supabase
    .from('bookings')
    .select('*')
    .ilike('guest_name', '%rishab%');

  if (bookingErr) {
    console.error("❌ Error fetching booking:", bookingErr.message);
    return;
  }

  if (!bookings || bookings.length === 0) {
    console.log("⚠️ No bookings found for guest name containing 'Rishab' in production.");
    return;
  }

  console.log(`Found ${bookings.length} matching booking(s):\n`);

  for (const booking of bookings) {
    console.log(`--------------------------------------------------`);
    console.log(`Booking ID:      ${booking.id}`);
    console.log(`Guest Name:      ${booking.guest_name}`);
    console.log(`Property ID:     ${booking.property_id}`);
    console.log(`Room ID:         ${booking.room_id}`);
    console.log(`Status:          ${booking.status}`);
    console.log(`Is Monthly:      ${booking.is_monthly ? 'Yes' : 'No'}`);
    console.log(`Booking Amount:  ₹${booking.amount}`);
    if (booking.is_monthly) {
      console.log(`Monthly Rate:    ₹${booking.monthly_rate}`);
    }
    console.log(`Check In:        ${booking.check_in}`);
    console.log(`Check Out:       ${booking.check_out}`);
    console.log(`Check In Time:   ${booking.check_in_time}`);
    console.log(`Check Out Time:  ${booking.check_out_time}`);
    console.log(`ID Verified:     ${booking.id_verified ? 'Yes' : 'No'}`);
    console.log(`Signature URL:   ${booking.signature_url ? 'Yes' : 'No'}`);
    console.log(`--------------------------------------------------`);

    // 2. Fetch Incidentals
    console.log("Fetching incidental charges...");
    const { data: incidentals, error: incErr } = await supabase
      .from('incidental_charges')
      .select('*')
      .eq('booking_id', booking.id);

    if (incErr) {
      console.error("❌ Error fetching incidentals:", incErr.message);
      continue;
    }

    console.log(`Found ${incidentals.length} incidental charge(s):`);
    incidentals.forEach((ch, idx) => {
      console.log(`  ${idx+1}. ₹${ch.amount} - ${ch.description} (${ch.business_date})`);
    });

    // 3. Fetch Payments
    console.log("\nFetching payments...");
    const { data: payments, error: payErr } = await supabase
      .from('payments')
      .select('*')
      .eq('booking_id', booking.id);

    if (payErr) {
      console.error("❌ Error fetching payments:", payErr.message);
      continue;
    }

    console.log(`Found ${payments.length} payment(s):`);
    payments.forEach((p, idx) => {
      console.log(`  ${idx+1}. ₹${p.amount} - Method: ${p.method} | Voided: ${p.is_void ? 'Yes (' + p.void_reason + ')' : 'No'} (${p.business_date})`);
    });

    // 4. Calculate Balance using the checkOutGuest logic
    console.log("\n=== Folio Balance Calculation (Like checkOutGuest action) ===");
    
    const dailyRoomChargesSum = incidentals
      ?.filter(item => item.description?.startsWith('Daily Room Charge'))
      ?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;

    const discountAmount = Number(booking.discount_amount || 0);
    const isMonthly = booking.is_monthly;
    const monthlyRate = Number(booking.monthly_rate || 0);

    const roomAmount = isMonthly
      ? Math.max(0, monthlyRate - discountAmount)
      : Math.max(0, Number(booking.amount) - discountAmount - dailyRoomChargesSum);

    let totalIncidentals = incidentals?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
    if (isMonthly && Number(booking.amount) > 0) {
      totalIncidentals += Number(booking.amount);
    }

    const totalPayments = payments
      ?.filter(item => !item.is_void)
      ?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;

    const totalCharges = roomAmount + totalIncidentals;
    const balanceDue = totalCharges - totalPayments;

    console.log(`Room Amount Calculation:`);
    if (isMonthly) {
      console.log(`  monthlyRate (₹${monthlyRate}) - discountAmount (₹${discountAmount}) = Room Amount: ₹${roomAmount}`);
    } else {
      console.log(`  booking.amount (₹${booking.amount}) - discountAmount (₹${discountAmount}) - dailyRoomChargesSum (₹${dailyRoomChargesSum}) = Room Amount: ₹${roomAmount}`);
    }
    console.log(`Total Incidentals:      ₹${totalIncidentals}`);
    if (isMonthly && Number(booking.amount) > 0) {
      console.log(`  (Includes security deposit virtual charge: ₹${booking.amount})`);
    }
    console.log(`Total Charges:          ₹${totalCharges} (Room: ₹${roomAmount} + Incidentals: ₹${totalIncidentals})`);
    console.log(`Total Active Payments:  ₹${totalPayments}`);
    console.log(`Calculated Balance Due: ₹${balanceDue.toFixed(2)}`);

    if (Math.abs(balanceDue) <= 0.01) {
      console.log("✅ Balance is settled (zero balance). Checkout should be allowed!");
    } else {
      console.log("❌ Folio has a non-zero balance. Settle the balance before departure.");
      if (balanceDue < 0) {
        console.log("👉 The guest has overpaid or has a refund due (negative balance). Since refund entries cannot be posted directly, checkout is blocked.");
      }
    }
  }
}

run().catch(console.error);
