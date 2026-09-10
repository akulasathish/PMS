import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "StaySync Premium Men's PG",
  description: "Experience StaySync Premium Men's PG accommodation. 3-times delicious homestyle food (2x chicken, 3x egg, separate veg cooking), high-speed Wi-Fi, 24/7 power backup, daily cleaning, and attached western washrooms.",
  keywords: ["Men PG", "Premium PG for Men", "Paying Guest for Men", "StaySync PG", "Affordable PG with Food"],
};

export default function PgLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#050507] text-zinc-100">
      {children}
    </div>
  );
}
