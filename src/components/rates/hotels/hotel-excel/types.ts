import { Hotel } from "@/types/hotels";

export interface HotelExcelDialogProps {
  isOpen: boolean;
  onClose: () => void;
  hotels: Hotel[];
  onSaveSuccess?: () => void;
}
