export function generateInvoiceHtml(payload: any) {
  const { bookingId, guestName, roomAmount, incidentals = [], totalPaid } = payload;
  
  // Dynamic GST Slabs for Indian Market
  let gstRate = 0;
  if (roomAmount > 1000 && roomAmount <= 7500) {
    gstRate = 0.12;
  } else if (roomAmount > 7500) {
    gstRate = 0.18;
  }

  const cgstRate = gstRate / 2;
  const sgstRate = gstRate / 2;
  
  const cgstAmount = roomAmount * cgstRate;
  const sgstAmount = roomAmount * sgstRate;
  
  const incidentalRows = incidentals.map((inc: any) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${inc.description}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${Number(inc.amount).toFixed(2)}</td>
    </tr>
  `).join('');

  return `
    <html>
      <head>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; line-height: 1.5; }
          .container { max-w-width: 800px; margin: 0 auto; padding: 40px; border: 1px solid #ddd; }
          .header { text-align: center; margin-bottom: 40px; }
          .gst-info { text-align: right; font-size: 12px; color: #666; }
          table { w-full; border-collapse: collapse; margin-top: 20px; }
          th { text-align: left; padding: 10px; border-bottom: 2px solid #333; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>TAX INVOICE</h1>
            <p>Booking Ref: ${bookingId}</p>
          </div>
          
          <div class="gst-info">
            <p><strong>HSN/SAC: 9963</strong> (Accommodation Services)</p>
          </div>

          <h3>Guest Name: ${guestName}</h3>
          
          <table style="width: 100%;">
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">Room Accommodation</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${roomAmount.toFixed(2)}</td>
              </tr>
              ${incidentalRows}
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">CGST (${(cgstRate * 100).toFixed(0)}%)</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${cgstAmount.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">SGST (${(sgstRate * 100).toFixed(0)}%)</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${sgstAmount.toFixed(2)}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <th style="padding-top: 20px;">Total Paid</th>
                <th style="text-align: right; padding-top: 20px;">₹${totalPaid.toFixed(2)}</th>
              </tr>
            </tfoot>
          </table>
        </div>
      </body>
    </html>
  `;
}
