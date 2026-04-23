"use client";

import MyBookingsWrapper from "../shared/my-bookings-wrapper";
import { HotelBookingCard } from "./hotel-cards";

export default function HotelMyBookingsWrapper() {
  const mockBookings = [
    {
      hotelName: "SinQ Beach Resort",
      rating: 3.5,
      location: "Thailand, Near I.G.I Airport Delhi",
      imageUrl: "https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg",
      status: "confirmed" as const,
      confirmationNumber: "4E3W32L3277793079",
      referenceNumber: "2807928881",
      price: 55000,
      lastVoucherDate: "20 Jul 2025",
      lastCancellationDate: "15 Jul 2025",
      checkInDate: "02 Aug 2025",
      checkOutDate: "05 Aug 2025",
      leadGuestName: "Harsh Aggarwal",
      bookedDate: "14 Jun 2025 6:09:34 PM",
      bookingId: "abcd",
      onWhatsApp: () => console.log("WhatsApp clicked"),
      onCancel: () => console.log("Cancel clicked"),
    },
    {
      hotelName: "Grand Plaza Hotel",
      rating: 4.2,
      location: "Mumbai, Andheri East",
      imageUrl: "https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg",
      status: "pending" as const,
      confirmationNumber: "5F4X43M4388804180",
      referenceNumber: "3918039992",
      price: 75000,
      lastVoucherDate: "25 Jul 2025",
      lastCancellationDate: "20 Jul 2025",
      checkInDate: "10 Aug 2025",
      checkOutDate: "15 Aug 2025",
      leadGuestName: "Priya Sharma",
      bookedDate: "15 Jun 2025 3:45:12 PM",
      bookingId: "efgh",
      onWhatsApp: () => console.log("WhatsApp clicked"),
      onCancel: () => console.log("Cancel clicked"),
    },
  ];

  return (
    <MyBookingsWrapper serviceType="hotel" bookingsCount={mockBookings.length}>
      {mockBookings.map((booking) => (
        <HotelBookingCard key={booking.bookingId} {...booking} />
      ))}
    </MyBookingsWrapper>
  );
}
