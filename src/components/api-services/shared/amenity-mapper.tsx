import { BriefcaseMedical } from "lucide-react";
import { ReactNode } from "react";
import {
  FaWifi,
  FaCar,
  FaPersonSwimming,
  FaDumbbell,
  FaSpa,
  FaUtensils,
  FaWineGlass,
  FaSnowflake,
  FaTv,
  FaShower,
  FaBath,
  FaDoorOpen,
  FaBell,
  FaMugHot,
  FaUmbrellaBeach,
  FaSmoking,
  FaBan,
  FaSuitcase,
  FaShirt,
  FaShield,
  FaBaby,
  FaPaw,
  FaWheelchair,
  FaBus,
  FaPlane,
  FaMartiniGlass,
  FaBed,
  FaCouch,
  FaDesktop,
  FaPrint,
  FaPhone,
  FaBuilding,
  FaElevator,
  FaTree,
  FaMountain,
  FaCity,
  FaWater,
  FaFireExtinguisher,
  FaKey,
  FaCreditCard,
  FaClock,
  FaUsers,
  FaBroom,
  FaFan,
  FaBlender,
  FaHotTubPerson,
} from "react-icons/fa6";

interface AmenityConfig {
  icon: ReactNode;
  displayName: string;
  patterns: RegExp[];
}

const AMENITY_CONFIGS: AmenityConfig[] = [
  {
    icon: <FaWifi className="size-4" />,
    displayName: "WiFi",
    patterns: [/wifi|wi-fi|internet|high.?speed/i],
  },
  {
    icon: <FaCar className="size-4" />,
    displayName: "Parking",
    patterns: [/park|valet/i],
  },
  {
    icon: <FaPersonSwimming className="size-4" />,
    displayName: "Pool",
    patterns: [/pool|swim/i],
  },
  {
    icon: <FaDumbbell className="size-4" />,
    displayName: "Fitness",
    patterns: [/gym|fitness|exercise|workout/i],
  },
  {
    icon: <FaSpa className="size-4" />,
    displayName: "Spa",
    patterns: [/spa|wellness|massage|beauty/i],
  },
  {
    icon: <FaHotTubPerson className="size-4" />,
    displayName: "Hot Tub",
    patterns: [/hot.?tub|jacuzzi|sauna/i],
  },
  {
    icon: <FaUtensils className="size-4" />,
    displayName: "Restaurant",
    patterns: [/restaurant|dining|food|meal/i],
  },
  {
    icon: <FaWineGlass className="size-4" />,
    displayName: "Bar",
    patterns: [/bar|mini.?bar|beverage/i],
  },
  {
    icon: <FaMartiniGlass className="size-4" />,
    displayName: "Lounge",
    patterns: [/lounge|cocktail/i],
  },
  {
    icon: <FaMugHot className="size-4" />,
    displayName: "Breakfast",
    patterns: [/breakfast|continental/i],
  },
  {
    icon: <FaBell className="size-4" />,
    displayName: "Room Service",
    patterns: [/room.?service|concierge|front.?desk|reception/i],
  },
  {
    icon: <FaSnowflake className="size-4" />,
    displayName: "Air Conditioning",
    patterns: [/air.?condition|ac|cooling|climate/i],
  },
  {
    icon: <FaFan className="size-4" />,
    displayName: "Heating",
    patterns: [/heat|warm/i],
  },
  {
    icon: <FaTv className="size-4" />,
    displayName: "TV",
    patterns: [/tv|television|cable|satellite|screen/i],
  },
  {
    icon: <FaShower className="size-4" />,
    displayName: "Shower",
    patterns: [/shower|rain.?shower/i],
  },
  {
    icon: <FaBath className="size-4" />,
    displayName: "Bathroom",
    patterns: [/bath|tub|toilet|wc|private.?bath/i],
  },
  {
    icon: <FaDoorOpen className="size-4" />,
    displayName: "Balcony",
    patterns: [/balcony|patio/i],
  },
  {
    icon: <FaUmbrellaBeach className="size-4" />,
    displayName: "Beach",
    patterns: [/beach|terrace|sun.?deck/i],
  },
  {
    icon: <FaSmoking className="size-4" />,
    displayName: "Smoking",
    patterns: [/smok(ing|e)/i],
  },
  {
    icon: <FaBan className="size-4" />,
    displayName: "Non-Smoking",
    patterns: [/non.?smok|no.?smok/i],
  },
  {
    icon: <FaSuitcase className="size-4" />,
    displayName: "Luggage Storage",
    patterns: [/luggage|baggage|storage/i],
  },
  {
    icon: <FaShirt className="size-4" />,
    displayName: "Laundry",
    patterns: [/laundry|dry.?clean|wash|iron/i],
  },
  {
    icon: <FaShield className="size-4" />,
    displayName: "Safe",
    patterns: [/safe|security.?box|deposit.?box/i],
  },
  {
    icon: <FaBaby className="size-4" />,
    displayName: "Family Friendly",
    patterns: [/baby|child|kid|family|playground|crib|cot/i],
  },
  {
    icon: <FaPaw className="size-4" />,
    displayName: "Pet Friendly",
    patterns: [/pet|dog|cat|animal/i],
  },
  {
    icon: <FaWheelchair className="size-4" />,
    displayName: "Accessible",
    patterns: [/wheelchair|accessible|disability|mobility/i],
  },
  {
    icon: <FaCar className="size-4" />,
    displayName: "Transport",
    patterns: [/transport|car.?rental|taxi/i],
  },
  {
    icon: <FaBus className="size-4" />,
    displayName: "Shuttle",
    patterns: [/shuttle|bus/i],
  },
  {
    icon: <FaPlane className="size-4" />,
    displayName: "Airport",
    patterns: [/airport/i],
  },
  {
    icon: <FaBlender className="size-4" />,
    displayName: "Kitchen",
    patterns: [/kitchen|kitchenette|refrigerator|fridge|microwave/i],
  },
  {
    icon: <FaBed className="size-4" />,
    displayName: "Bed",
    patterns: [/bed|king|queen|twin|double/i],
  },
  {
    icon: <FaCouch className="size-4" />,
    displayName: "Sofa",
    patterns: [/sofa|couch|seating/i],
  },
  {
    icon: <FaDesktop className="size-4" />,
    displayName: "Business",
    patterns: [/desk|workspace|business.?center|office/i],
  },
  {
    icon: <FaPrint className="size-4" />,
    displayName: "Printer",
    patterns: [/print|fax|copy/i],
  },
  {
    icon: <FaPhone className="size-4" />,
    displayName: "Phone",
    patterns: [/phone|telephone/i],
  },
  {
    icon: <FaElevator className="size-4" />,
    displayName: "Elevator",
    patterns: [/elevator|lift/i],
  },
  {
    icon: <FaTree className="size-4" />,
    displayName: "Garden",
    patterns: [/garden|green.?space/i],
  },
  {
    icon: <FaMountain className="size-4" />,
    displayName: "Mountain View",
    patterns: [/mountain.?view|hill.?view/i],
  },
  {
    icon: <FaCity className="size-4" />,
    displayName: "City View",
    patterns: [/city.?view|urban.?view/i],
  },
  {
    icon: <FaWater className="size-4" />,
    displayName: "Water View",
    patterns: [/sea.?view|ocean.?view|water.?view|lake.?view/i],
  },
  {
    icon: <FaFireExtinguisher className="size-4" />,
    displayName: "Fire Safety",
    patterns: [/fire.?extinguish|fire.?safety|smoke.?detect/i],
  },
  {
    icon: <BriefcaseMedical className="size-4" />,
    displayName: "First Aid",
    patterns: [/first.?aid|medical/i],
  },
  {
    icon: <FaKey className="size-4" />,
    displayName: "Key Access",
    patterns: [/key|keycard|access.?card/i],
  },
  {
    icon: <FaCreditCard className="size-4" />,
    displayName: "Payment",
    patterns: [/card.?payment|credit.?card|payment/i],
  },
  {
    icon: <FaClock className="size-4" />,
    displayName: "24-Hour Service",
    patterns: [/24.?hour|24\/7|all.?day/i],
  },
  {
    icon: <FaUsers className="size-4" />,
    displayName: "Meeting Room",
    patterns: [/meeting|conference|event|banquet/i],
  },
  {
    icon: <FaBroom className="size-4" />,
    displayName: "Housekeeping",
    patterns: [/housekeep|cleaning|maid/i],
  },
];

export function findAmenityMatch(amenityName: string): {
  config: { icon: ReactNode; displayName: string };
} | null {
  const normalized = amenityName.toLowerCase().trim();

  const match = AMENITY_CONFIGS.find((config) =>
    config.patterns.some((pattern) => pattern.test(normalized))
  );

  if (match) {
    return {
      config: {
        icon: match.icon,
        displayName: match.displayName,
      },
    };
  }

  return null;
}

export function getAmenityIcon(amenityName: string): ReactNode {
  const match = findAmenityMatch(amenityName);
  return match?.config.icon ?? <FaBuilding className="size-4" />;
}

export function getAmenityDisplayName(amenityName: string): string {
  const match = findAmenityMatch(amenityName);
  return match?.config.displayName ?? amenityName;
}
