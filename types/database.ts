// =============================================================
// Yellow Sand — Supabase Database Types
// Regenerate with: npm run supabase:generate-types
// =============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: "buyer" | "dealer" | "admin";
          full_name: string | null;
          email: string;
          phone: string | null;
          country: string | null;
          avatar_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: "buyer" | "dealer" | "admin";
          full_name?: string | null;
          email: string;
          phone?: string | null;
          country?: string | null;
          avatar_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: "buyer" | "dealer" | "admin";
          full_name?: string | null;
          email?: string;
          phone?: string | null;
          country?: string | null;
          avatar_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      dealer_profiles: {
        Row: {
          id: string;
          user_id: string;
          business_name: string;
          trade_license_number: string | null;
          trade_license_url: string | null;
          location: string;
          description: string | null;
          website_url: string | null;
          verification_status: "unverified" | "kyc_pending" | "verified" | "suspended";
          trustin_kyc_id: string | null;
          rejection_reason: string | null;
          verified_at: string | null;
          verified_by: string | null;
          rating: number;
          total_transactions: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          business_name: string;
          trade_license_number?: string | null;
          trade_license_url?: string | null;
          location?: string;
          description?: string | null;
          website_url?: string | null;
          verification_status?: "unverified" | "kyc_pending" | "verified" | "suspended";
          trustin_kyc_id?: string | null;
          rejection_reason?: string | null;
          verified_at?: string | null;
          verified_by?: string | null;
          rating?: number;
          total_transactions?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["dealer_profiles"]["Insert"]>;
      };
      vehicles: {
        Row: {
          id: string;
          dealer_id: string;
          title: string;
          make: string;
          model: string;
          year: number;
          mileage: number;
          price_aed: number;
          description: string | null;
          condition: "excellent" | "good" | "fair";
          color: string | null;
          fuel_type: "petrol" | "diesel" | "hybrid" | "electric" | null;
          transmission: "automatic" | "manual" | null;
          body_type: string | null;
          vin: string | null;
          export_ready: boolean;
          shipping_port: string | null;
          location: string;
          status: "draft" | "pending_review" | "active" | "reserved" | "sold" | "suspended";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          dealer_id: string;
          title: string;
          make: string;
          model: string;
          year: number;
          mileage: number;
          price_aed: number;
          description?: string | null;
          condition: "excellent" | "good" | "fair";
          color?: string | null;
          fuel_type?: "petrol" | "diesel" | "hybrid" | "electric" | null;
          transmission?: "automatic" | "manual" | null;
          body_type?: string | null;
          vin?: string | null;
          export_ready?: boolean;
          shipping_port?: string | null;
          location?: string;
          status?: "draft" | "pending_review" | "active" | "reserved" | "sold" | "suspended";
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["vehicles"]["Insert"]>;
      };
      vehicle_images: {
        Row: {
          id: string;
          vehicle_id: string;
          url: string;
          is_primary: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          vehicle_id: string;
          url: string;
          is_primary?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["vehicle_images"]["Insert"]>;
      };
      inspection_reports: {
        Row: {
          id: string;
          vehicle_id: string;
          inspector_name: string | null;
          inspection_date: string | null;
          overall_rating: "pass" | "conditional" | "fail" | null;
          engine_condition: "excellent" | "good" | "fair" | "poor" | null;
          body_condition: "excellent" | "good" | "fair" | "poor" | null;
          interior_condition: "excellent" | "good" | "fair" | "poor" | null;
          notes: string | null;
          report_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          vehicle_id: string;
          inspector_name?: string | null;
          inspection_date?: string | null;
          overall_rating?: "pass" | "conditional" | "fail" | null;
          engine_condition?: "excellent" | "good" | "fair" | "poor" | null;
          body_condition?: "excellent" | "good" | "fair" | "poor" | null;
          interior_condition?: "excellent" | "good" | "fair" | "poor" | null;
          notes?: string | null;
          report_url?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["inspection_reports"]["Insert"]>;
      };
      transactions: {
        Row: {
          id: string;
          reference_number: string;
          vehicle_id: string;
          buyer_id: string;
          dealer_id: string;
          status: TransactionStatus;
          vehicle_price_aed: number;
          platform_fee_aed: number;
          shipping_cost_aed: number | null;
          total_amount_aed: number;
          buyer_currency: string;
          total_amount_buyer_currency: number | null;
          exchange_rate: number | null;
          stripe_payment_intent_id: string | null;
          stripe_charge_id: string | null;
          trustin_escrow_id: string | null;
          destination_country: string;
          destination_port: string | null;
          shipping_tracking_number: string | null;
          estimated_delivery_date: string | null;
          notes: string | null;
          funded_at: string | null;
          completed_at: string | null;
          cancelled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          reference_number?: string;
          vehicle_id: string;
          buyer_id: string;
          dealer_id: string;
          status?: TransactionStatus;
          vehicle_price_aed: number;
          platform_fee_aed: number;
          shipping_cost_aed?: number | null;
          total_amount_aed: number;
          buyer_currency?: string;
          total_amount_buyer_currency?: number | null;
          exchange_rate?: number | null;
          stripe_payment_intent_id?: string | null;
          trustin_escrow_id?: string | null;
          destination_country: string;
          destination_port?: string | null;
          notes?: string | null;
          funded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["transactions"]["Insert"]>;
      };
      transaction_milestones: {
        Row: {
          id: string;
          transaction_id: string;
          milestone_type: MilestoneType;
          status: "pending" | "in_progress" | "completed" | "failed";
          completed_by: string | null;
          completed_at: string | null;
          notes: string | null;
          document_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          transaction_id: string;
          milestone_type: MilestoneType;
          status?: "pending" | "in_progress" | "completed" | "failed";
          completed_by?: string | null;
          completed_at?: string | null;
          notes?: string | null;
          document_url?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["transaction_milestones"]["Insert"]>;
      };
      transaction_events: {
        Row: {
          id: string;
          transaction_id: string;
          event_type: string;
          actor_id: string | null;
          actor_role: string | null;
          payload: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          transaction_id: string;
          event_type: string;
          actor_id?: string | null;
          actor_role?: string | null;
          payload?: Json;
          created_at?: string;
        };
        Update: never;
      };
      documents: {
        Row: {
          id: string;
          transaction_id: string;
          document_type: DocumentType;
          name: string;
          url: string;
          uploaded_by: string;
          verified: boolean;
          verified_by: string | null;
          verified_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          transaction_id: string;
          document_type: DocumentType;
          name: string;
          url: string;
          uploaded_by: string;
          verified?: boolean;
          verified_by?: string | null;
          verified_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["documents"]["Insert"]>;
      };
      disputes: {
        Row: {
          id: string;
          transaction_id: string;
          raised_by: string;
          reason: DisputeReason;
          description: string;
          status: DisputeStatus;
          resolved_by: string | null;
          resolution: "refund_buyer" | "release_to_dealer" | "partial_refund" | null;
          resolution_notes: string | null;
          created_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          transaction_id: string;
          raised_by: string;
          reason: DisputeReason;
          description: string;
          status?: DisputeStatus;
          resolved_by?: string | null;
          resolution?: "refund_buyer" | "release_to_dealer" | "partial_refund" | null;
          resolution_notes?: string | null;
          created_at?: string;
          resolved_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["disputes"]["Insert"]>;
      };
      reservations: {
        Row: {
          id: string;
          vehicle_id: string;
          buyer_id: string;
          dealer_id: string;
          status: "pending" | "active" | "expired" | "cancelled" | "converted";
          deposit_amount_gbp: number;
          deposit_amount_aed: number | null;
          stripe_checkout_session_id: string | null;
          stripe_payment_intent_id: string | null;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          vehicle_id: string;
          buyer_id: string;
          dealer_id: string;
          status?: "pending" | "active" | "expired" | "cancelled" | "converted";
          deposit_amount_gbp: number;
          deposit_amount_aed?: number | null;
          stripe_checkout_session_id?: string | null;
          stripe_payment_intent_id?: string | null;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["reservations"]["Insert"]>;
      };
      saved_vehicles: {
        Row: {
          id: string;
          user_id: string;
          vehicle_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          vehicle_id: string;
          created_at?: string;
        };
        Update: never;
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          body: string;
          type: NotificationType;
          read: boolean;
          related_transaction_id: string | null;
          related_vehicle_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          body: string;
          type: NotificationType;
          read?: boolean;
          related_transaction_id?: string | null;
          related_vehicle_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};

// =============================================================
// Convenience type aliases
// =============================================================
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type DealerProfile = Database["public"]["Tables"]["dealer_profiles"]["Row"];
export type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"];
export type VehicleImage = Database["public"]["Tables"]["vehicle_images"]["Row"];
export type InspectionReport = Database["public"]["Tables"]["inspection_reports"]["Row"];
export type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
export type TransactionMilestone = Database["public"]["Tables"]["transaction_milestones"]["Row"];
export type TransactionEvent = Database["public"]["Tables"]["transaction_events"]["Row"];
export type Document = Database["public"]["Tables"]["documents"]["Row"];
export type Dispute = Database["public"]["Tables"]["disputes"]["Row"];
export type Reservation = Database["public"]["Tables"]["reservations"]["Row"];
export type SavedVehicle = Database["public"]["Tables"]["saved_vehicles"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];

export type TransactionStatus =
  | "pending_payment"
  | "funded"
  | "inspection_pending"
  | "inspection_complete"
  | "documentation_pending"
  | "documentation_verified"
  | "shipping_pending"
  | "in_transit"
  | "delivered"
  | "completed"
  | "disputed"
  | "cancelled"
  | "refunded";

export type MilestoneType =
  | "payment_received"
  | "inspection_verified"
  | "documentation_verified"
  | "shipping_confirmed"
  | "delivery_confirmed"
  | "funds_released";

export type DocumentType =
  | "title_deed"
  | "export_certificate"
  | "customs_declaration"
  | "bill_of_lading"
  | "insurance"
  | "other";

export type DisputeReason =
  | "vehicle_not_as_described"
  | "not_received"
  | "documentation_issue"
  | "shipping_delay"
  | "damage"
  | "other";

export type DisputeStatus =
  | "open"
  | "under_review"
  | "resolved_buyer"
  | "resolved_dealer"
  | "closed";

export type NotificationType =
  | "transaction_update"
  | "milestone_complete"
  | "dispute_opened"
  | "dispute_resolved"
  | "vehicle_approved"
  | "dealer_approved"
  | "reservation_created"
  | "reservation_expired"
  | "general";
