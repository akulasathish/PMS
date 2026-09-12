import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "StaySync Premium Men's PG | Madhapur, Hyderabad | Free Electricity & Meals",
  description: "Premium men's PG in Madhapur, Hyderabad near HITEC City. Free electricity (₹0 bills), 3-time non-repetitive meals, dual 200 Mbps Wi-Fi, 24/7 power backup, daily housekeeping, attached western washrooms, lockable wooden cupboards. 2/3/4/5 sharing. Contact: +91 8686113435.",
  keywords: [
    "men's PG in Madhapur Hyderabad",
    "PG near HITEC City",
    "paying guest Madhapur",
    "PG with free electricity Hyderabad",
    "best PG in Madhapur",
    "premium PG near Cyber Towers",
    "PG with meals Hyderabad",
    "affordable PG HITEC City",
    "boys PG Madhapur",
    "PG near Mindspace Hyderabad",
    "furnished PG Madhapur",
    "PG with Wi-Fi Hyderabad",
    "men's hostel Madhapur",
    "working professional PG Hyderabad",
    "PG near IT parks Hyderabad",
    "StaySync PG",
  ],
  openGraph: {
    title: "StaySync Premium Men's PG — Madhapur, Hyderabad",
    description: "Free electricity, 3-time meals, 200 Mbps Wi-Fi, 24/7 power backup. Premium men's PG near HITEC City, Cyber Towers & Mindspace. Call +91 8686113435.",
    url: "https://pg.staysync.online",
    siteName: "StaySync Premium Men's PG",
    type: "website",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "StaySync Premium Men's PG | Madhapur, Hyderabad",
    description: "Free electricity, 3-time meals, 200 Mbps Wi-Fi. Premium men's PG near HITEC City. Call +91 8686113435.",
  },
  alternates: {
    canonical: "https://pg.staysync.online",
  },
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
