import fs from 'fs';

let content = fs.readFileSync('src/app/guest/regcard/[id]/page.tsx', 'utf8');

// 1. Update handleSubmit to insert into 'guests' table and include property_id
const oldSubmit = `      // 3. Update Booking Table
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ 
          id_verified: true,
          id_photo_url: fileName,
          signature_url: signatureData,
          status: 'Confirmed' // Ensure it's ready for check-in
        })
        .eq('id', bookingId);`;

const newSubmit = `      // 3. ATOMIC GUEST REGISTRATION: Insert into 'guests' and update 'bookings'
      // We must explicitly include property_id for RLS compliance
      const { error: guestError } = await supabase
        .from('guests')
        .insert([{
          booking_id: bookingId,
          property_id: booking.property_id, // Mandatory for RLS
          full_name: booking.guest_name,
          email: booking.guest_email,
          id_photo_url: fileName,
          signature_url: signatureData
        }]);

      if (guestError) throw guestError;

      const { error: updateError } = await supabase
        .from('bookings')
        .update({ 
          id_verified: true,
          id_photo_url: fileName,
          signature_url: signatureData,
          status: 'Confirmed'
        })
        .eq('id', bookingId);`;

content = content.replace(oldSubmit, newSubmit);
fs.writeFileSync('src/app/guest/regcard/[id]/page.tsx', content);
console.log("Guest Submission fixed with property_id and new 'guests' table insert!");
