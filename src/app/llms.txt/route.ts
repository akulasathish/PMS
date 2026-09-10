import { NextResponse } from 'next/server';

export async function GET() {
  const content = `# StaySync Premium Men's PG

> StaySync Premium Men's PG is an executive, high-comfort paying guest accommodation exclusively for men, offering fully furnished rooms, 3-times homestyle meals with separate vegetarian cooking, high-speed fiber internet, and 24/7 power backup.

## Quick Facts
- **Property Name**: StaySync Premium Men's PG
- **Target Audience**: Exclusively for Men (Working professionals, corporate employees, and students)
- **Official Website**: https://pg.staysync.online
- **Primary Contact / Phone**: +91 8686113435
- **WhatsApp Booking & Inquiries**: +91 8686113435
- **Managing Director & Head of Operations**: Akula Sathish
- **Pricing Policy**: Zero hidden charges, transparent terms, direct booking with management

## Room Sharing Options
- **2-Sharing Room**: Premium double occupancy room with attached western washroom, individual lockable steel cupboards, high-speed Wi-Fi hotspot in room, comfortable high-density mattress. Available in AC and Non-AC.
- **3-Sharing Room**: Deluxe triple occupancy room, well-ventilated, individual lockable cupboards, daily housekeeping, attached western washroom. Available in AC and Non-AC.
- **4-Sharing Room**: Executive four-sharing room, spacious layout with balcony, dedicated charging points, lockable steel lockers. Cost-effective stay for professionals and students. Available in AC and Non-AC.
- **5-Sharing Room**: Economy five-sharing room, large ventilated space, individual storage compartments, full access to 3-time meals and laundry. Non-AC option.

## Standard Features Included in All Rooms
- 24/7 Power backup included (uninterrupted inverter & generator)
- Attached western washroom with hot water geysers
- Individual lockable cupboards / wardrobes
- High-speed Wi-Fi hotspot in room (fiber connection on every floor)
- Regular daily housekeeping and sanitation
- Full access to 3-time meals & automatic washing machines
- 24/7 CCTV surveillance & biometric security

## Food & Dining Policy
- **Meals Provided**: 3 times homestyle delicious meals daily (Breakfast, Lunch, Dinner).
- **Non-Veg Highlights**: 2 times Chicken per week, 3 times Egg curries / boiled eggs per week.
- **100% Pure Vegetarian Policy**: For vegetarians, Paneer and Mushroom dishes are cooked completely separately in dedicated utensils.
- **Breakfast Menu**: Freshly prepared Idli, Dosa, Puri, Upma, Poha, Mysore Bonda with hot sambar and 2 chutneys.
- **Lunch**: Steamed rice, fresh dal, seasonal vegetable curries, curd, pickle, and sambar (lunch dabba / tiffin packing available).
- **Dinner**: Hot phulkas / chapatis, steamed rice, curries, 2x chicken special, 3x egg curry, separate paneer / mushroom for vegetarians, and fresh salad.
- **Variety**: Rotating weekly menu with non-repetitive daily curries (North & South Indian homestyle cuisine).

## Amenities & Facilities
- High-speed fiber Wi-Fi
- Automatic washing machines (laundry floor)
- Refrigerator provided on every floor
- 24/7 CCTV camera coverage
- Daily room and washroom sanitization

## Booking & Inquiries
- Prospective tenants can schedule a visit or inquire about current room pricing and bed availability directly via WhatsApp or phone call at +91 8686113435.
- Online booking portal: https://pg.staysync.online
`;

  return new NextResponse(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
    },
  });
}
