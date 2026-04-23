'use client';

import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import S3Image from '@/components/ui/s3-image';
import {
  Building2,
  Map,
  Car,
  Package,
  UtensilsCrossed,
  Plane,
  Users,
  MapPin,
  Clock,
  Calendar,
  Star,
  Sparkles,
  Phone,
  Mail,
  CheckCircle,
  XCircle,
  FileText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  getServiceDetailsByServiceId,
  type TourPackageDetails,
  type TransferPackageDetails,
  type HotelRoomDetails,
} from '@/data-access/service-details';
import type { FileAttachment } from '@/types/common';
import { cn } from '@/lib/utils';

interface ActivityDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: {
    id?: string;
    activity_id?: string;
    service_id?: string; // NEW: Package/Room ID
    package_type?: string;
    service_type?: string;
    hotel_id?: string;
    tour_id?: string;
    transfer_id?: string;
    combo_id?: string;
    title?: string;
    activity?: string;
    hotel_name?: string;
    tour_name?: string;
    transfer_name?: string;
    // Activity-level fields from itinerary_activities
    check_in_date?: string;
    check_out_date?: string;
    tour_date?: string;
    pickup_date?: string;
    pickup_point?: string;
    drop_point?: string;
    adults?: number;
    teens?: number;
    children?: number;
    infants?: number;
    children_ages?: number[];
    cost_price?: number;
    sale_price?: number;
    notes?: string;
    [key: string]: any;
  } | null;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  hotel: Building2,
  tour: Map,
  transfer: Car,
  combo: Package,
  meal: UtensilsCrossed,
  meal_plan: UtensilsCrossed,
  activity: Sparkles,
  flight: Plane,
  guide: Users,
};

const CATEGORY_COLORS: Record<string, string> = {
  hotel: 'bg-blue-50 text-blue-700 border-blue-200',
  tour: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  transfer: 'bg-violet-50 text-violet-700 border-violet-200',
  combo: 'bg-amber-50 text-amber-700 border-amber-200',
  meal: 'bg-rose-50 text-rose-700 border-rose-200',
  meal_plan: 'bg-rose-50 text-rose-700 border-rose-200',
  activity: 'bg-teal-50 text-teal-700 border-teal-200',
  flight: 'bg-sky-50 text-sky-700 border-sky-200',
  guide: 'bg-orange-50 text-orange-700 border-orange-200',
};

interface ServiceDisplayData {
  name: string;
  category: string;
  images: FileAttachment[];
  location?: string;
  sections: { key: string; label: string; content: React.ReactNode }[];
}

export default function ActivityDetailsSheet({
  open,
  onOpenChange,
  activity,
}: ActivityDetailsSheetProps) {
  const [loading, setLoading] = useState(false);
  const [displayData, setDisplayData] = useState<ServiceDisplayData | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (open && activity) {
      loadDetails();
      setCurrentImageIndex(0);
    } else {
      setDisplayData(null);
      setActiveTab('overview');
      setCurrentImageIndex(0);
    }
  }, [open, activity]);

  const loadDetails = async () => {
    if (!activity) return;

    setLoading(true);
    try {
      const category = activity.package_type || activity.service_type || 'tour';
      const serviceId = activity.service_id;

      console.log('[ActivityDetailsSheet] Loading details', {
        serviceId,
        category,
        activityId: activity.id || activity.activity_id,
      });

      // If we have service_id, fetch package-level details
      if (serviceId) {
        const { data, error } = await getServiceDetailsByServiceId(
          serviceId,
          category as 'hotel' | 'tour' | 'transfer' | 'combo'
        );

        console.log('[ActivityDetailsSheet] Service details result', {
          hasData: !!data,
          dataType: data?.type,
          error,
        });

        if (data && !error) {
          switch (data.type) {
            case 'hotel':
              setDisplayData(transformHotelRoomData(data.data, activity));
              break;
            case 'tour':
              setDisplayData(transformTourPackageData(data.data, activity));
              break;
            case 'transfer':
              setDisplayData(transformTransferPackageData(data.data, activity));
              break;
            case 'combo':
              setDisplayData(transformTourPackageData(data.data, activity)); // Combos use tour package structure
              break;
          }
          setLoading(false);
          return;
        } else if (error) {
          console.error('[ActivityDetailsSheet] Error from service details:', error);
        }
      } else {
        console.log('[ActivityDetailsSheet] No service_id found, using basic details');
      }

      // Fallback to basic details from activity
      setDisplayData(createBasicDetails(activity));
    } catch (error) {
      console.error('[ActivityDetailsSheet] Error loading details:', error);
      setDisplayData(createBasicDetails(activity));
    } finally {
      setLoading(false);
    }
  };

  // Transform hotel room data for display
  const transformHotelRoomData = (data: HotelRoomDetails, activity: any): ServiceDisplayData => {
    const images: FileAttachment[] = (data.images || []).map((url) => ({
      url,
      name: 'Hotel Image',
      type: 'image',
    }));

    return {
      name: data.hotel_name || 'Hotel',
      category: 'hotel',
      images,
      location: [data.city_name, data.country_name].filter(Boolean).join(', '),
      sections: [
        {
          key: 'overview',
          label: 'Overview',
          content: (
            <div className="space-y-6">
              {/* Hotel Info */}
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Hotel Information
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <InfoItem label="Hotel Name" value={data.hotel_name} icon={Building2} />
                  <InfoItem label="Address" value={data.hotel_address} icon={MapPin} />
                  <InfoItem label="City" value={data.city_name} />
                  <InfoItem label="Country" value={data.country_name} />
                  <InfoItem
                    label="Star Rating"
                    value={data.star_rating ? `${data.star_rating} Star` : undefined}
                    icon={Star}
                  />
                  <InfoItem label="Property Type" value={data.property_type} />
                </div>
              </div>

              <Separator />

              {/* Guest & Stay Details */}
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Guest Details
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <InfoItem
                    label="Check-in"
                    value={formatDate(activity.check_in_date)}
                    icon={Calendar}
                  />
                  <InfoItem
                    label="Check-out"
                    value={formatDate(activity.check_out_date)}
                    icon={Calendar}
                  />
                  <InfoItem label="Room Category" value={data.room_category} />
                  <InfoItem label="Meal Plan" value={data.meal_plan} icon={UtensilsCrossed} />
                  <InfoItem label="Max Occupancy" value={data.max_occupancy} icon={Users} />
                  <InfoItem
                    label="Guests"
                    value={formatGuests(
                      activity.adults,
                      activity.teens,
                      activity.children,
                      activity.infants
                    )}
                    icon={Users}
                  />
                </div>
              </div>

              {/* Description */}
              {data.hotel_description && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {data.hotel_description}
                    </p>
                  </div>
                </>
              )}

              {/* Notes */}
              {(activity.notes || data.remarks) && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Notes
                    </h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {activity.notes || data.remarks}
                    </p>
                  </div>
                </>
              )}
            </div>
          ),
        },
        {
          key: 'pricing',
          label: 'Pricing',
          content: (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <PriceCard label="Cost Price" value={activity.cost_price} />
                <PriceCard label="Sale Price" value={activity.sale_price} highlight />
              </div>
              {data.seasons && data.seasons.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold mb-2">Seasonal Rates</h4>
                  <div className="space-y-2">
                    {data.seasons.map((season: any, idx: number) => (
                      <div key={idx} className="p-3 border rounded-lg text-sm">
                        <p className="font-medium">{season.dates || 'All Season'}</p>
                        <p className="text-muted-foreground">Rate/Night: {season.rate_per_night}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ),
        },
        {
          key: 'policies',
          label: 'Policies',
          content: (
            <div className="space-y-4 text-sm">
              {data.cancellation_policy && (
                <div>
                  <h4 className="font-semibold mb-2">Cancellation Policy</h4>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {data.cancellation_policy}
                  </p>
                </div>
              )}
              {data.payment_policy && (
                <div>
                  <h4 className="font-semibold mb-2">Payment Policy</h4>
                  <p className="text-muted-foreground whitespace-pre-wrap">{data.payment_policy}</p>
                </div>
              )}
              {data.extra_bed_policy && (
                <div>
                  <h4 className="font-semibold mb-2">Extra Bed Policy</h4>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {data.extra_bed_policy}
                  </p>
                </div>
              )}
              {!data.cancellation_policy && !data.payment_policy && !data.extra_bed_policy && (
                <p className="text-muted-foreground">No policy information available</p>
              )}
            </div>
          ),
        },
        {
          key: 'contact',
          label: 'Contact',
          content: (
            <div className="space-y-3 text-sm">
              <InfoItem label="Phone" value={data.hotel_phone} icon={Phone} />
              <InfoItem label="Email" value={data.hotel_email} icon={Mail} />
              <InfoItem label="Address" value={data.hotel_address} icon={MapPin} />
            </div>
          ),
        },
      ],
    };
  };

  // Transform tour package data for display
  const transformTourPackageData = (
    data: TourPackageDetails,
    activity: any
  ): ServiceDisplayData => {
    const images: FileAttachment[] = (data.images || []).map((url) => ({
      url,
      name: 'Tour Image',
      type: 'image',
    }));

    const isCombo = data.iscombo;

    return {
      name: data.name || data.tour_name || 'Tour',
      category: isCombo ? 'combo' : 'tour',
      images,
      location: [data.city_name, data.country_name].filter(Boolean).join(', '),
      sections: [
        {
          key: 'overview',
          label: 'Overview',
          content: (
            <div className="space-y-6">
              {/* Tour Info */}
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Map className="h-4 w-4" />
                  Tour Information
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <InfoItem label="Tour Name" value={data.tour_name || data.name} icon={Map} />
                  <InfoItem label="City" value={data.city_name} />
                  <InfoItem label="Country" value={data.country_name} />
                  <InfoItem label="Tour Type" value={data.tour_type} />
                  <InfoItem label="Category" value={data.tour_category} />
                  {data.duration && (
                    <InfoItem label="Duration" value={formatDuration(data.duration)} icon={Clock} />
                  )}
                </div>
              </div>

              <Separator />

              {/* Passenger & Date Details */}
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Booking Details
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <InfoItem
                    label="Tour Date"
                    value={formatDate(activity.tour_date)}
                    icon={Calendar}
                  />
                  <InfoItem
                    label="Passengers"
                    value={formatGuests(
                      activity.adults,
                      activity.teens,
                      activity.children,
                      activity.infants
                    )}
                    icon={Users}
                  />
                  {data.max_participants && (
                    <InfoItem label="Max Participants" value={String(data.max_participants)} />
                  )}
                  <InfoItem
                    label="Pickup Point"
                    value={data.pickup_point || activity.pickup_point}
                    icon={MapPin}
                  />
                  <InfoItem
                    label="Drop Point"
                    value={data.dropoff_point || activity.drop_point}
                    icon={MapPin}
                  />
                  <InfoItem label="Meeting Point" value={data.meeting_point} icon={MapPin} />
                </div>
              </div>

              {/* Description */}
              {(data.description || data.tour_description) && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {data.description || data.tour_description}
                    </p>
                  </div>
                </>
              )}

              {/* Notes */}
              {(activity.notes || data.notes || data.remarks) && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Notes
                    </h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {activity.notes || data.notes || data.remarks}
                    </p>
                  </div>
                </>
              )}
            </div>
          ),
        },
        {
          key: 'inclusions',
          label: 'Inclusions',
          content: (
            <div className="space-y-4">
              {data.inclusions && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Included
                  </h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {data.inclusions}
                  </p>
                </div>
              )}
              {data.exclusions && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    Not Included
                  </h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {data.exclusions}
                  </p>
                </div>
              )}
              {!data.inclusions && !data.exclusions && (
                <p className="text-sm text-muted-foreground">No inclusion information available</p>
              )}
            </div>
          ),
        },
        {
          key: 'pricing',
          label: 'Pricing',
          content: (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <PriceCard label="Cost Price" value={activity.cost_price} />
                <PriceCard label="Sale Price" value={activity.sale_price} highlight />
              </div>
              {data.child_policy && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold mb-2">Child Policy</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {data.child_policy}
                  </p>
                </div>
              )}
            </div>
          ),
        },
      ],
    };
  };

  // Transform transfer package data for display
  const transformTransferPackageData = (
    data: TransferPackageDetails,
    activity: any
  ): ServiceDisplayData => {
    const images: FileAttachment[] = (data.images || []).map((url) => ({
      url,
      name: 'Transfer Image',
      type: 'image',
    }));

    return {
      name: data.name || data.transfer_name || 'Transfer',
      category: 'transfer',
      images,
      location: [data.city_name, data.country_name].filter(Boolean).join(', '),
      sections: [
        {
          key: 'overview',
          label: 'Overview',
          content: (
            <div className="space-y-6">
              {/* Transfer Info */}
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Car className="h-4 w-4" />
                  Transfer Information
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <InfoItem
                    label="Transfer Name"
                    value={data.transfer_name || data.name}
                    icon={Car}
                  />
                  <InfoItem label="Transfer Mode" value={data.mode} />
                  <InfoItem label="Route" value={data.route} />
                  {data.duration && (
                    <InfoItem label="Duration" value={data.duration} icon={Clock} />
                  )}
                </div>
              </div>

              <Separator />

              {/* Pickup/Drop Details */}
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Route Details
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <InfoItem
                    label="Pickup Date"
                    value={formatDate(activity.pickup_date)}
                    icon={Calendar}
                  />
                  <InfoItem
                    label="Passengers"
                    value={formatGuests(
                      activity.adults,
                      activity.teens,
                      activity.children,
                      activity.infants
                    )}
                    icon={Users}
                  />
                  <InfoItem
                    label="Pickup Point"
                    value={data.origin || activity.pickup_point}
                    icon={MapPin}
                  />
                  <InfoItem
                    label="Drop Point"
                    value={data.destination || activity.drop_point}
                    icon={MapPin}
                  />
                  {data.via && <InfoItem label="Via" value={data.via} />}
                  {data.num_stops !== undefined && data.num_stops > 0 && (
                    <InfoItem label="Stops" value={String(data.num_stops)} />
                  )}
                </div>
              </div>

              {/* Description */}
              {data.description && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {data.description}
                    </p>
                  </div>
                </>
              )}

              {/* Notes */}
              {(activity.notes || data.remarks) && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Notes
                    </h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {activity.notes || data.remarks}
                    </p>
                  </div>
                </>
              )}
            </div>
          ),
        },
        {
          key: 'inclusions',
          label: 'Inclusions',
          content: (
            <div className="space-y-4">
              {data.inclusions && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Included
                  </h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {data.inclusions}
                  </p>
                </div>
              )}
              {data.exclusions && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    Not Included
                  </h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {data.exclusions}
                  </p>
                </div>
              )}
              {!data.inclusions && !data.exclusions && (
                <p className="text-sm text-muted-foreground">No inclusion information available</p>
              )}
            </div>
          ),
        },
        {
          key: 'pricing',
          label: 'Pricing',
          content: (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <PriceCard label="Cost Price" value={activity.cost_price} />
                <PriceCard label="Sale Price" value={activity.sale_price} highlight />
              </div>
              {data.child_policy && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold mb-2">Child Policy</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {data.child_policy}
                  </p>
                </div>
              )}
            </div>
          ),
        },
      ],
    };
  };

  // Fallback for when no service_id or fetch fails
  const createBasicDetails = (activity: any): ServiceDisplayData => {
    const category = activity.package_type || activity.service_type || 'tour';
    const name =
      activity.title ||
      activity.activity ||
      activity.hotel_name ||
      activity.tour_name ||
      activity.transfer_name ||
      activity.activity_name ||
      'Activity';

    // Get images from activity if available
    const activityImages: FileAttachment[] = (activity.images || []).map((url: string) => ({
      url,
      name: 'Activity Image',
      type: 'image',
    }));

    return {
      name,
      category,
      images: activityImages,
      location: activity.location,
      sections: [
        {
          key: 'overview',
          label: 'Overview',
          content: (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoItem
                  label="Guests"
                  value={formatGuests(
                    activity.adults,
                    activity.teens,
                    activity.children,
                    activity.infants
                  )}
                  icon={Users}
                />
                {activity.notes && (
                  <InfoItem label="Notes" value={activity.notes} icon={FileText} />
                )}
              </div>
              {!activity.notes && (
                <p className="text-sm text-muted-foreground">
                  No additional details available. Service details will be shown once service_id is
                  linked.
                </p>
              )}
            </div>
          ),
        },
        {
          key: 'pricing',
          label: 'Pricing',
          content: (
            <div className="grid grid-cols-2 gap-4">
              <PriceCard label="Cost Price" value={activity.cost_price} />
              <PriceCard label="Sale Price" value={activity.sale_price} highlight />
            </div>
          ),
        },
      ],
    };
  };

  const Icon = displayData ? CATEGORY_ICONS[displayData.category] || Map : Map;
  const colorClass = displayData
    ? CATEGORY_COLORS[displayData.category] || CATEGORY_COLORS.tour
    : CATEGORY_COLORS.tour;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[90vw] p-0 flex flex-col">
        <SheetHeader className="p-4 border-b shrink-0">
          <div className="flex items-start gap-3">
            {loading ? (
              <Skeleton className="h-6 w-48" />
            ) : (
              <SheetTitle className="text-left flex-1">
                {displayData?.name || 'Loading...'}
              </SheetTitle>
            )}
          </div>
          {displayData?.location && (
            <div className="flex items-center gap-4">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {displayData.location}
              </p>
              <Badge variant="outline" className={cn(colorClass, 'capitalize')}>
                <Icon className="h-3 w-3 mr-1" />
                {displayData?.category || 'Activity'}
              </Badge>
            </div>
          )}
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0">
          {loading ? (
            <div className="p-4 space-y-4">
              <Skeleton className="h-48 w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : displayData ? (
            <div className="flex flex-col">
              {/* Images Gallery */}
              {displayData.images.length > 0 && (
                <div className="relative shrink-0 bg-muted">
                  <div className="h-48 w-full relative">
                    <S3Image
                      url={displayData.images[currentImageIndex]?.url}
                      alt={`${displayData.name} - Image ${currentImageIndex + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {/* Image counter */}
                    <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                      {currentImageIndex + 1} / {displayData.images.length}
                    </div>
                    {/* Navigation buttons */}
                    {displayData.images.length > 1 && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 bg-black/40 hover:bg-black/60 text-white"
                          onClick={() => setCurrentImageIndex((prev) => (prev === 0 ? displayData.images.length - 1 : prev - 1))}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 bg-black/40 hover:bg-black/60 text-white"
                          onClick={() => setCurrentImageIndex((prev) => (prev === displayData.images.length - 1 ? 0 : prev + 1))}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                  {/* Thumbnail strip */}
                  {displayData.images.length > 1 && (
                    <div className="flex gap-1 p-2 overflow-x-auto">
                      {displayData.images.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentImageIndex(idx)}
                          className={`shrink-0 w-12 h-12 rounded overflow-hidden border-2 transition-colors ${
                            idx === currentImageIndex ? 'border-primary' : 'border-transparent'
                          }`}
                        >
                          <S3Image url={img.url} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
                <TabsList className="w-full justify-start px-4 border-b rounded-none bg-transparent">
                  {displayData.sections.map((section) => (
                    <TabsTrigger
                      key={section.key}
                      value={section.key}
                      className="data-[state=active]:border-x-0 data-[state=active]:border-t-0 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                    >
                      {section.label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <div className="p-4">
                  {displayData.sections.map((section) => (
                    <TabsContent key={section.key} value={section.key} className="mt-0">
                      {section.content}
                    </TabsContent>
                  ))}
                </div>
              </Tabs>
            </div>
          ) : (
            <div className="p-4 text-center text-muted-foreground">No details available</div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

// Helper component for displaying info items
function InfoItem({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value?: string | null;
  icon?: React.ElementType;
}) {
  if (!value) return null;
  return (
    <div className="space-y-0.5">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="font-medium flex items-center gap-1.5">
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
        {value}
      </p>
    </div>
  );
}

// Helper component for price cards
function PriceCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value?: number | string | null;
  highlight?: boolean;
}) {
  const displayValue = value !== undefined && value !== null ? Number(value).toLocaleString() : '–';

  return (
    <div
      className={`p-3 rounded-lg border ${highlight ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'}`}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${highlight ? 'text-primary' : ''}`}>{displayValue}</p>
    </div>
  );
}

// Helper function to format date
function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// Helper function to format guests (includes teens)
function formatGuests(
  adults?: number,
  teens?: number,
  children?: number,
  infants?: number
): string {
  const parts: string[] = [];
  if (adults && adults > 0) parts.push(`${adults} Adult${adults > 1 ? 's' : ''}`);
  if (teens && teens > 0) parts.push(`${teens} Teen${teens > 1 ? 's' : ''}`);
  if (children && children > 0) parts.push(`${children} Child${children > 1 ? 'ren' : ''}`);
  if (infants && infants > 0) parts.push(`${infants} Infant${infants > 1 ? 's' : ''}`);
  return parts.length > 0 ? parts.join(', ') : '';
}

// Helper function to format duration
function formatDuration(duration: { days?: number; hours?: number; minutes?: number }): string {
  const parts: string[] = [];
  if (duration.days && duration.days > 0) parts.push(`${duration.days}d`);
  if (duration.hours && duration.hours > 0) parts.push(`${duration.hours}h`);
  if (duration.minutes && duration.minutes > 0) parts.push(`${duration.minutes}m`);
  return parts.length > 0 ? parts.join(' ') : '';
}
