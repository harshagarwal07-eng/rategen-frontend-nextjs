export interface NavItem {
  label: string;
  href?: string;
  active?: boolean;
  items?: Array<{
    label: string;
    href: string;
  }>;
}

export enum DocumentType {
  HOTELS = "hotels",
  TOURS = "tours",
  TRANSFERS = "transfers",
  COMBOS = "combos",
  MEALS = "meals",
  GUIDES = "guides",
  CAR_ON_DISPOSAL = "car-on-disposal",
}

export interface IOption {
  label: string;
  value: string;
  code?: string;
}

export interface KeyValue {
  [key: string]: number;
}

export interface SearchParams {
  search?: string;
  page: number;
  perPage: number;
  sort: Array<{ id: string; desc: boolean }>;
}

export interface IDMCAgreementEmailData {
  dmcName: string;
  dmcAddress: string;
  dmcCountry: string;
  adminEmail: string;
  adminMobile: string;
}

export interface DMCAgreementEmailProps extends IDMCAgreementEmailData {
  date: string;
  month: string;
  year: string;
}

export interface ISource {
  id: string;
  name: string;
}

export interface FileAttachment {
  url: string;
  name: string;
  type: string;
}
