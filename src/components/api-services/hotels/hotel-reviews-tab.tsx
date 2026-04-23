"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RatingStar } from "@/components/common/RatingStars";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThumbsUp } from "lucide-react";

type RatingBreakdown = {
  rating: number;
  count: number;
  percentage: number;
};

type Review = {
  id: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  date: string;
  title: string;
  comment: string;
  helpful: number;
  tripType: string;
  roomType: string;
};

type HotelReviews = {
  overallRating: number;
  totalReviews: number;
  ratingBreakdown: RatingBreakdown[];
  categoryRatings: {
    category: string;
    rating: number;
  }[];
  reviews: Review[];
};

// Sample reviews data - will be replaced with API data
const SAMPLE_REVIEWS: HotelReviews = {
  overallRating: 4.3,
  totalReviews: 1247,
  ratingBreakdown: [
    { rating: 5, count: 687, percentage: 55 },
    { rating: 4, count: 312, percentage: 25 },
    { rating: 3, count: 149, percentage: 12 },
    { rating: 2, count: 62, percentage: 5 },
    { rating: 1, count: 37, percentage: 3 },
  ],
  categoryRatings: [
    { category: "Cleanliness", rating: 4.5 },
    { category: "Service", rating: 4.2 },
    { category: "Location", rating: 4.4 },
    { category: "Room Quality", rating: 4.8 },
    { category: "Amenities", rating: 4.4 },
    { category: "Value for Money", rating: 4.0 },
    { category: "Food and Beverage", rating: 4.5 },
  ],
  reviews: [
    {
      id: "1",
      userName: "Sarah Johnson",
      userAvatar: "https://i.pravatar.cc/150?img=1",
      rating: 5,
      date: "2025-01-15",
      title: "Excellent stay with great service",
      comment:
        "Had a wonderful experience at this hotel. The staff were extremely friendly and helpful throughout our stay. The room was spacious and clean. The location is perfect - very close to the airport which made our early morning flight much easier. Highly recommend!",
      helpful: 23,
      tripType: "Business",
      roomType: "Deluxe Room",
    },
    {
      id: "2",
      userName: "Michael Chen",
      userAvatar: "https://i.pravatar.cc/150?img=2",
      rating: 4,
      date: "2025-01-10",
      title: "Great location but noisy",
      comment:
        "The hotel is in a great location near the airport and shopping centers. Staff was helpful and check-in was quick. However, the rooms could use better soundproofing - we could hear traffic noise throughout the night. The breakfast buffet was excellent with lots of variety.",
      helpful: 18,
      tripType: "Leisure",
      roomType: "Standard Room",
    },
    {
      id: "3",
      userName: "Priya Sharma",
      userAvatar: "https://i.pravatar.cc/150?img=3",
      rating: 5,
      date: "2025-01-05",
      title: "Perfect for families",
      comment:
        "We stayed here with our two kids and had a great time. The rooms are spacious enough for a family. The pool was clean and well-maintained. Staff went out of their way to make our stay comfortable. The eco-friendly practices are a nice touch. Will definitely return!",
      helpful: 31,
      tripType: "Family",
      roomType: "Family Suite",
    },
    {
      id: "4",
      userName: "James Wilson",
      userAvatar: "https://i.pravatar.cc/150?img=4",
      rating: 3,
      date: "2024-12-28",
      title: "Average experience",
      comment:
        "The hotel is decent but nothing special. Room was clean but felt a bit dated. The WiFi connection was spotty. Good points were the helpful staff and convenient location. Breakfast could be improved with more variety. Overall, it's okay for a short stay.",
      helpful: 12,
      tripType: "Business",
      roomType: "Standard Room",
    },
    {
      id: "5",
      userName: "Emily Brown",
      userAvatar: "https://i.pravatar.cc/150?img=5",
      rating: 5,
      date: "2024-12-20",
      title: "Exceeded expectations",
      comment:
        "This hotel exceeded all my expectations! From the moment we arrived, we were treated like VIPs. The room was spotless and beautifully decorated. The fitness center is well-equipped and the pool area is lovely. Great value for money. I'll definitely be back on my next trip!",
      helpful: 27,
      tripType: "Leisure",
      roomType: "Deluxe Room",
    },
  ],
};

export default function HotelReviewsTab() {
  return (
    <div className="space-y-6">
      {/* Overall Rating */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid lg:grid-cols-[auto_1fr] gap-x-12 gap-y-6">
            {/* Left Side: Rating Score and Star Breakdown */}
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Rating Score */}
              <div className="flex flex-col items-center justify-start text-center min-w-[200px]">
                <div className="text-6xl font-bold mb-2">{SAMPLE_REVIEWS.overallRating}</div>
                <RatingStar rating={SAMPLE_REVIEWS.overallRating} size="lg" />
                <p className="text-sm text-muted-foreground mt-2">
                  Based on {SAMPLE_REVIEWS.totalReviews.toLocaleString()} reviews
                </p>
              </div>

              {/* Star Rating Breakdown */}
              <div className="space-y-2 min-w-[280px]">
                {SAMPLE_REVIEWS.ratingBreakdown.map((item) => (
                  <div key={item.rating} className="flex items-center gap-3">
                    <span className="text-sm font-medium w-12">{item.rating} star</span>
                    <Progress value={item.percentage} className="flex-1 h-2" />
                    <span className="text-sm text-muted-foreground min-w-12 text-right">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Side: Category Ratings */}
            <div className="lg:col-start-2">
              <h3 className="font-semibold text-base mb-4">Rating Categories</h3>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_REVIEWS.categoryRatings.map((item) => (
                  <Badge key={item.category} variant="outline" className="px-3 py-1.5 text-sm font-normal">
                    {item.category} {item.rating}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Reviews */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Guest Reviews</h3>
        {SAMPLE_REVIEWS.reviews.map((review) => (
          <Card key={review.id}>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <Avatar className="h-12 w-12 shrink-0">
                  <AvatarImage src={review.userAvatar} alt={review.userName} />
                  <AvatarFallback>
                    {review.userName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div>
                      <p className="font-semibold">{review.userName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <RatingStar rating={review.rating} />
                        <span className="text-sm text-muted-foreground">
                          {new Date(review.date).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {review.tripType}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {review.roomType}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <p className="font-medium mb-1.5">{review.title}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{review.comment}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground pt-1">
                    <ThumbsUp className="h-3.5 w-3.5" />
                    <span className="text-xs">
                      {review.helpful} {review.helpful === 1 ? "person" : "people"} found this helpful
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
