import { NextResponse } from "next/server";

export async function GET() {
  const token = process.env.NEXT_PUBLIC_IPINFO_TOKEN || "33da729ceb08c4";

  try {
    const url = token
      ? `https://ipinfo.io/json?token=${token}`
      : "https://ipinfo.io/json";

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json({
        location: { lat: -6.2088, lng: 106.8456 },
        city: "Jakarta",
        region: "Jakarta",
        country: "ID",
      });
    }

    const data = await res.json();
    if (!data.loc) {
      return NextResponse.json({
        location: { lat: -6.2088, lng: 106.8456 },
        city: "Jakarta",
        region: "Jakarta",
        country: "ID",
      });
    }

    const [latStr, lngStr] = data.loc.split(",");
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);

    return NextResponse.json({
      location: {
        lat: isNaN(lat) ? -6.2088 : lat,
        lng: isNaN(lng) ? 106.8456 : lng,
      },
      city: data.city || null,
      region: data.region || null,
      country: data.country || null,
    });
  } catch {
    return NextResponse.json({
      location: { lat: -6.2088, lng: 106.8456 },
      city: "Jakarta",
      region: "Jakarta",
      country: "ID",
    });
  }
}
