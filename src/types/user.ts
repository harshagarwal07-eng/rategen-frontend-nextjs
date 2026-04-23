import { JwtPayload } from "jwt-decode";

export interface IJWTPayload extends JwtPayload {
  user_role: string;
}

export interface IDMCShort {
  id: string;
  name: string;
  avatar_url?: string;
  streetAddress?: string;
  city?: string;
  country?: string;
  countryServing?: string[];
  regionServing?: string[];
  servicesOffered?: string[];
  website?: string;
  queryType?: string[];
  status?: string;
}

export interface ITeam {
  id: string;
  name: string;
  avatar_url?: string;
  designation: string;
  email: string;
  phone: string;
}

export interface ITaProfile {
  id: string;
  website?: string;
  city?: string;
  country?: string;
  name: string;
  streetAddress?: string;
  avatar_url?: string;
  admin_id: {
    user_id: string;
    name: string;
    phone?: string;
  };
}
