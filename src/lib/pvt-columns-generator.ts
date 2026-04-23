import { Transfer } from "@/types/transfers";
import { Tour } from "@/types/tours";

// Helper function to extract all unique keys from pvt_rate data
export const extractPvtRateKeys = (data: (Transfer | Tour)[]): string[] => {
  const keysSet = new Set<string>();

  data.forEach((row) => {
    // Check packages > seasons for pvt_rate data (both Tours and Transfers now use packages)
    if ('packages' in row && row.packages && Array.isArray(row.packages)) {
      row.packages.forEach((pkg: any) => {
        if (pkg.seasons && Array.isArray(pkg.seasons)) {
          pkg.seasons.forEach((season: any) => {
            if (season.pvt_rate && typeof season.pvt_rate === "object") {
              Object.keys(season.pvt_rate).forEach((key) => keysSet.add(key));
            }
          });
        }
      });
    }
  });

  return Array.from(keysSet).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  );
};

export const extractPerVehicleRateKeys = (data: (Transfer | Tour)[]): string[] => {
  const keysSet = new Set<string>();

  data.forEach((row) => {
    // Check packages > seasons for per_vehicle_rate data (both Tours and Transfers now use packages)
    if ('packages' in row && row.packages && Array.isArray(row.packages)) {
      row.packages.forEach((pkg: any) => {
        if (pkg.seasons && Array.isArray(pkg.seasons)) {
          pkg.seasons.forEach((season: any) => {
            if (season.per_vehicle_rate && Array.isArray(season.per_vehicle_rate)) {
              season.per_vehicle_rate.forEach((vehicle: any) => {
                if (vehicle.vehicle_type) {
                  keysSet.add(vehicle.vehicle_type);
                }
              });
            }
          });
        }
      });
    }
  });

  return Array.from(keysSet).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  );
};

// Helper function to get value for a specific key from pvt_rate object
export const getPvtRateValue = (
  pvtRateData: Record<string, number>,
  key: string
): string => {
  if (!pvtRateData || typeof pvtRateData !== "object") {
    return "-";
  }

  const value = pvtRateData[key];
  return value !== undefined ? value.toLocaleString() : "-";
};

// Function to generate dynamic columns - server-side version
export const generateTourColumnsConfig = (data: (Transfer | Tour)[]) => {
  const pvtRateKeys = extractPvtRateKeys(data);

  return {
    pvtRateKeys,
    hasPvtRateKeys: pvtRateKeys.length > 0,
  };
};
