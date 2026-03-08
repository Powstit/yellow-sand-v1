// =============================================================
// Yellow Sand — Application Constants
// =============================================================

export const APP_NAME = "Yellow Sand";
export const APP_TAGLINE = "UAE Vehicles. Delivered to Africa.";

// Supported destination countries
export const DESTINATION_COUNTRIES = {
  NG: {
    code: "NG",
    name: "Nigeria",
    currency: "NGN",
    currencySymbol: "₦",
    defaultPort: "Apapa, Lagos",
    importDutyPercent: 35,
    vatPercent: 7.5,
    levyPercent: 2, // NHIS levy etc.
    portChargesAed: 2500,
  },
  GH: {
    code: "GH",
    name: "Ghana",
    currency: "GHS",
    currencySymbol: "GH₵",
    defaultPort: "Tema Port, Accra",
    importDutyPercent: 30,
    vatPercent: 15,
    levyPercent: 0,
    portChargesAed: 2000,
  },
} as const;

export type DestinationCountryCode = keyof typeof DESTINATION_COUNTRIES;

// Default shipping cost from Jebel Ali to West Africa (AED)
export const DEFAULT_SHIPPING_COST_AED = 8500;

// Insurance = 1.5% of vehicle value
export const INSURANCE_PERCENT = 0.015;

// Platform fee
export const PLATFORM_FEE_PERCENT = 0.025; // 2.5%

// Transaction limits
export const MIN_VEHICLE_PRICE_AED = 10000;
export const MAX_VEHICLE_PRICE_AED = 2000000;

// Vehicle makes for filter
export const VEHICLE_MAKES = [
  "Toyota",
  "Nissan",
  "Mitsubishi",
  "Ford",
  "Hyundai",
  "Kia",
  "Lexus",
  "BMW",
  "Mercedes-Benz",
  "Land Rover",
  "Jeep",
  "Chevrolet",
  "Dodge",
  "GMC",
  "Porsche",
] as const;

export const BODY_TYPES = [
  "SUV",
  "Sedan",
  "Pickup",
  "Coupe",
  "Hatchback",
  "Van",
  "Bus",
  "Truck",
] as const;

// Transaction status labels + colours
export const TRANSACTION_STATUS_CONFIG = {
  pending_payment: {
    label: "Pending Payment",
    color: "text-yellow-600 bg-yellow-50 border-yellow-200",
    step: 0,
  },
  funded: {
    label: "Funded",
    color: "text-blue-600 bg-blue-50 border-blue-200",
    step: 1,
  },
  inspection_pending: {
    label: "Inspection Pending",
    color: "text-orange-600 bg-orange-50 border-orange-200",
    step: 2,
  },
  inspection_complete: {
    label: "Inspection Complete",
    color: "text-blue-600 bg-blue-50 border-blue-200",
    step: 3,
  },
  documentation_pending: {
    label: "Documentation Pending",
    color: "text-orange-600 bg-orange-50 border-orange-200",
    step: 4,
  },
  documentation_verified: {
    label: "Docs Verified",
    color: "text-blue-600 bg-blue-50 border-blue-200",
    step: 5,
  },
  shipping_pending: {
    label: "Awaiting Shipment",
    color: "text-orange-600 bg-orange-50 border-orange-200",
    step: 6,
  },
  in_transit: {
    label: "In Transit",
    color: "text-indigo-600 bg-indigo-50 border-indigo-200",
    step: 7,
  },
  delivered: {
    label: "Delivered",
    color: "text-green-600 bg-green-50 border-green-200",
    step: 8,
  },
  completed: {
    label: "Completed",
    color: "text-green-700 bg-green-100 border-green-300",
    step: 9,
  },
  disputed: {
    label: "Disputed",
    color: "text-red-600 bg-red-50 border-red-200",
    step: -1,
  },
  cancelled: {
    label: "Cancelled",
    color: "text-gray-600 bg-gray-50 border-gray-200",
    step: -1,
  },
  refunded: {
    label: "Refunded",
    color: "text-purple-600 bg-purple-50 border-purple-200",
    step: -1,
  },
} as const;
