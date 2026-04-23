"use client";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, MapPin, Phone, Mail, Globe, CheckCircle2, XCircle } from "lucide-react";
import { findAmenityMatch } from "../shared/amenity-mapper";
import { InfoRow } from "../shared/info-row";
import { IAmenityCategory, IHotelPolicy } from "@/types/api-service";

type HotelInfo = {
  description: string;
  checkInTime: string;
  checkOutTime: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  amenities: IAmenityCategory[];
  policies: IHotelPolicy[];
};

// Sample hotel data - will be replaced with API data
const SAMPLE_HOTEL_INFO: HotelInfo = {
  description:
    "Majestic Eco Comforts offers a perfect blend of luxury and sustainability. Located in the heart of the city, our hotel features modern amenities, spacious rooms, and exceptional service. Whether you're here for business or leisure, we provide everything you need for a comfortable stay. Our eco-friendly practices ensure that your comfort doesn't come at the cost of the environment.",
  checkInTime: "2:00 PM",
  checkOutTime: "12:00 PM",
  address: "123 Green Avenue, Near I.G.I Airport, New Delhi, Delhi 110037, India",
  phone: "+91 11 1234 5678",
  email: "info@majesticeco.com",
  website: "www.majesticeco.com",
  amenities: [
    {
      category: "General",
      items: [
        { name: "Free WiFi", available: true },
        { name: "Air conditioning", available: true },
        { name: "24-hour front desk", available: true },
        { name: "Non-smoking rooms", available: true },
        { name: "Pets allowed", available: false },
        { name: "Family rooms", available: true },
        { name: "Facilities for disabled guests", available: true },
      ],
    },
    {
      category: "Food & Drink",
      items: [
        { name: "Restaurant", available: true },
        { name: "Room service", available: true },
        { name: "Bar", available: true },
        { name: "Breakfast available", available: true },
      ],
    },
    {
      category: "Activities",
      items: [
        { name: "Fitness center", available: true },
        { name: "Swimming pool", available: true },
        { name: "Spa and wellness center", available: true },
        { name: "Garden", available: true },
      ],
    },
    {
      category: "Services",
      items: [
        { name: "Free parking", available: true },
        { name: "Airport shuttle", available: true },
        { name: "Concierge service", available: true },
        { name: "Currency exchange", available: true },
        { name: "Laundry service", available: true },
        { name: "Dry cleaning", available: true },
      ],
    },
  ],
  policies: [
    {
      title: "Check-in/Check-out",
      description:
        "Check-in from 2:00 PM. Check-out until 12:00 PM. Early check-in and late check-out subject to availability and may incur additional charges.",
    },
    {
      title: "Cancellation Policy",
      description:
        "Free cancellation up to 24 hours before check-in. Cancellations made within 24 hours of check-in will be charged one night's stay. No-shows will be charged the full reservation amount.",
    },
    {
      title: "Children & Extra Beds",
      description:
        "Children of all ages are welcome. Children under 12 years stay free when using existing beds. Extra beds are available upon request for an additional charge.",
    },
    {
      title: "Payment",
      description:
        "We accept cash, credit cards (Visa, Mastercard, American Express), and debit cards. Payment is required at the time of check-in unless prepaid during booking.",
    },
    {
      title: "Pets",
      description:
        "Pets are not allowed at this property. Service animals are permitted with prior notification and appropriate documentation.",
    },
  ],
};

export default function HotelInfoTab() {
  return (
    <div className="space-y-6">
      {/* Hotel Description */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="font-semibold text-lg mb-3">About this property</h3>
          <p className="text-muted-foreground leading-relaxed">{SAMPLE_HOTEL_INFO.description}</p>
        </CardContent>
      </Card>

      {/* Contact & Times */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="font-semibold text-lg mb-4">Property Information</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <InfoRow
                icon={Clock}
                label="Check-in / Check-out"
                value={`${SAMPLE_HOTEL_INFO.checkInTime} / ${SAMPLE_HOTEL_INFO.checkOutTime}`}
              />
              <InfoRow icon={MapPin} label="Address" value={SAMPLE_HOTEL_INFO.address} />
            </div>
            <div className="space-y-3">
              <InfoRow icon={Phone} label="Phone" value={SAMPLE_HOTEL_INFO.phone} />
              <InfoRow icon={Mail} label="Email" value={SAMPLE_HOTEL_INFO.email} />
              <InfoRow icon={Globe} label="Website" value={SAMPLE_HOTEL_INFO.website} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Amenities */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="font-semibold text-lg mb-4">Facilities & Amenities</h3>
          <div className="space-y-4">
            {SAMPLE_HOTEL_INFO.amenities.map((amenityGroup) => (
              <div key={amenityGroup.category}>
                <h4 className="font-medium mb-3">{amenityGroup.category}</h4>
                <div className="grid md:grid-cols-2 gap-3">
                  {amenityGroup.items.map((item) => {
                    const amenityMatch = findAmenityMatch(item.name);
                    return (
                      <div key={item.name} className="flex items-center gap-2 text-sm">
                        {amenityMatch?.config && (
                          <span className="[&>svg]:size-4 shrink-0">{amenityMatch.config.icon}</span>
                        )}
                        <span className={item.available ? "text-foreground" : "text-muted-foreground line-through"}>
                          {amenityMatch?.config?.displayName || item.name}
                        </span>
                        {item.available ? (
                          <CheckCircle2 className="size-5 text-success shrink-0" />
                        ) : (
                          <XCircle className="size-5 text-destructive shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Policies */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="font-semibold text-lg mb-4">Hotel Policies</h3>
          <div className="space-y-4">
            {SAMPLE_HOTEL_INFO.policies.map((policy) => (
              <div key={policy.title} className="border-b pb-4 last:border-b-0 last:pb-0">
                <h4 className="font-medium mb-2">{policy.title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{policy.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
