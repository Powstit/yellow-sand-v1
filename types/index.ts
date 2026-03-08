// Re-export all database types
export * from "./database";

// =============================================================
// Application-level types (beyond raw DB rows)
// =============================================================

import type { Vehicle, VehicleImage, DealerProfile, InspectionReport, Profile, Transaction, TransactionMilestone, Dispute } from "./database";

// Vehicle with joined relations
export type VehicleWithDetails = Vehicle & {
  images: VehicleImage[];
  primary_image?: VehicleImage | null;
  inspection_report?: InspectionReport | null;
  dealer: DealerProfile & { profile: Profile };
  is_saved?: boolean;
};

// Transaction with all joins
export type TransactionWithDetails = Transaction & {
  vehicle: Vehicle & { images: VehicleImage[] };
  buyer: Profile;
  dealer: DealerProfile & { profile: Profile };
  milestones: TransactionMilestone[];
  dispute?: Dispute | null;
};

// Landed cost calculator
export interface LandedCostInput {
  vehiclePriceAed: number;
  destinationCountry: "NG" | "GH";
  shippingCostAed?: number;
}

export interface LandedCostBreakdown {
  vehiclePriceAed: number;
  shippingCostAed: number;
  cifAed: number; // Cost + Insurance + Freight
  importDutyPercent: number;
  importDutyAed: number;
  vatPercent: number;
  vatAed: number;
  levyAed: number; // Country-specific levy
  portChargesAed: number;
  platformFeeAed: number;
  totalAed: number;
  exchangeRate: number;
  totalBuyerCurrency: number;
  buyerCurrency: "NGN" | "GHS";
}

// Vehicle search/filter params
export interface VehicleSearchParams {
  q?: string;
  make?: string;
  model?: string;
  minPrice?: number;
  maxPrice?: number;
  minYear?: number;
  maxYear?: number;
  maxMileage?: number;
  condition?: string;
  transmission?: string;
  fuelType?: string;
  bodyType?: string;
  exportReady?: boolean;
  page?: number;
  limit?: number;
  sortBy?: "price_asc" | "price_desc" | "year_desc" | "mileage_asc" | "created_desc";
}

// API response wrapper
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

// Pagination
export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  limit: number;
  totalPages: number;
}
