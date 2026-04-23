export interface TourCategory {
  value: string;
  label: string;
  subcategories: string[];
}

export const tourCategories: TourCategory[] = [
  {
    value: "sightseeing-attractions",
    label: "Sightseeing & Attractions",
    subcategories: [
      "Monuments & Landmarks",
      "Museums & Galleries",
      "Heritage Sites",
      "Architectural Tours",
      "Iconic Buildings & Viewpoints",
    ],
  },
  {
    value: "city-cultural-experiences",
    label: "City & Cultural Experiences",
    subcategories: [
      "City Tours (guided / hop-on hop-off)",
      "Culture & Local Lifestyle Tours",
      "Walking Tours",
      "Neighborhood Tours",
      "Street Art / Mural Tours",
    ],
  },
  {
    value: "history-heritage",
    label: "History & Heritage",
    subcategories: [
      "Historical Tours",
      "Archaeological Tours",
      "Religion & Spirituality Tours",
      "War & Political History Tours",
    ],
  },
  {
    value: "nature-wildlife",
    label: "Nature & Wildlife",
    subcategories: [
      "National Park Tours",
      "Safaris & Wildlife Experiences",
      "Forest & Jungle Tours",
      "Birdwatching",
      "Nature Walks / Eco Tours",
    ],
  },
  {
    value: "adventure-outdoor",
    label: "Adventure & Outdoor Activities",
    subcategories: [
      "Ziplining",
      "Paragliding / Parasailing",
      "Rock Climbing",
      "Bungee Jumping",
      "Canyoning",
      "ATV / Quad Biking",
      "Caving",
    ],
  },
  {
    value: "water-activities",
    label: "Water Activities & Sports",
    subcategories: [
      "Boat & Yacht Cruises",
      "Snorkeling",
      "Scuba Diving",
      "Kayaking / Canoeing",
      "Jet Skiing",
      "Rafting",
      "Stand-up Paddleboarding",
      "Fishing Trips",
    ],
  },
  {
    value: "mountains-trekking",
    label: "Mountains & Trekking",
    subcategories: [
      "Hiking & Trekking Tours",
      "Mountaineering",
      "Skiing / Snowboarding",
      "Glacier Walks",
    ],
  },
  {
    value: "food-gastronomy",
    label: "Food & Gastronomy",
    subcategories: [
      "Food Walks",
      "Cooking Classes",
      "Wine / Beer / Spirit Tastings",
      "Farm-to-Table Experiences",
      "Market Tours",
    ],
  },
  {
    value: "entertainment-events",
    label: "Entertainment & Events",
    subcategories: [
      "Concerts & Shows",
      "Theatre & Performances",
      "Festivals & Special Events",
      "Movie / TV Location Tours",
    ],
  },
  {
    value: "nightlife-evening",
    label: "Nightlife & Evening Experiences",
    subcategories: [
      "Pub Crawls",
      "Night Cruises",
      "Night City Tours",
      "Light Shows / Water Shows",
    ],
  },
  {
    value: "wellness-relaxation",
    label: "Wellness & Relaxation",
    subcategories: [
      "Spa & Massage Experiences",
      "Thermal Baths / Hot Springs",
      "Yoga & Meditation",
      "Wellness Retreats",
    ],
  },
  {
    value: "sports-active",
    label: "Sports & Active Experiences",
    subcategories: [
      "Cycling Tours",
      "Running Tours",
      "Golf",
      "Indoor Sports Experiences",
      "Local Sports Cultural Experiences",
    ],
  },
  {
    value: "unique-immersive",
    label: "Unique & Immersive Experiences",
    subcategories: [
      "Hot Air Balloon Rides",
      "Helicopter Tours",
      "Submarine Rides",
      "Ice Hotels / Igloo Experiences",
      "VR / AR Activities",
      "Thematic / Story-based Tours",
    ],
  },
  {
    value: "tours-on-wheels",
    label: "Tours on Wheels",
    subcategories: [
      "Car Tours",
      "Motorbike Tours",
      "Segway Tours",
      "E-scooter Tours",
      "Bicycle Tours",
    ],
  },
  {
    value: "cruises-marine",
    label: "Cruises & Marine Excursions",
    subcategories: [
      "River Cruises",
      "Sunset Cruises",
      "Dinner Cruises",
      "Island Hopping",
      "Ferry Experiences",
    ],
  },
  {
    value: "theme-parks",
    label: "Theme Parks & Entertainment Zones",
    subcategories: [
      "Amusement Parks",
      "Water Parks",
      "Safari Parks / Aquariums",
      "Snow / Indoor Adventure Parks",
    ],
  },
  {
    value: "shopping-experiences",
    label: "Shopping Experiences",
    subcategories: [
      "Souvenir & Craft Shopping",
      "Market Visits",
      "Outlet Mall Tours",
      "Luxury Shopping Tours",
    ],
  },
  {
    value: "educational-skill",
    label: "Educational & Skill-based Experiences",
    subcategories: [
      "Workshops (Art, Craft, Photography)",
      "Language / Culture Classes",
      "Professional Training (e.g., barista, pottery)",
    ],
  },
  {
    value: "community-social",
    label: "Community & Social Impact",
    subcategories: [
      "Volunteering Activities",
      "Community-Based Tourism",
      "Farm / Village Immersion",
    ],
  },
  {
    value: "transfers-logistics",
    label: "Transfers & Logistics-based",
    subcategories: [
      "Airport Transfers + Sightseeing Combos",
      "Scenic Train Rides",
      "Cable Car / Ropeway Experiences",
    ],
  },
];

// Helper to get category options for multi-select
export const getCategoryOptions = () =>
  tourCategories.map((cat) => ({
    value: cat.value,
    label: cat.label,
  }));

// Helper to get subcategories for a category
export const getSubcategories = (categoryValue: string): string[] => {
  const category = tourCategories.find((cat) => cat.value === categoryValue);
  return category?.subcategories || [];
};

// Helper to get category label by value
export const getCategoryLabel = (categoryValue: string): string => {
  const category = tourCategories.find((cat) => cat.value === categoryValue);
  return category?.label || categoryValue;
};
