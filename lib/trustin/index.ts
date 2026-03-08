/**
 * TrustIn Escrow API Client
 *
 * Wraps the TrustIn escrow service for vehicle transaction escrow management.
 * All calls use the service API key and are made server-side only.
 *
 * Replace placeholder endpoints with actual TrustIn API documentation.
 */

const TRUSTIN_API_URL = process.env.TRUSTIN_API_URL ?? "https://api.trustin.com/v1";
const TRUSTIN_API_KEY = process.env.TRUSTIN_API_KEY ?? "";

interface TrustInEscrow {
  id: string;
  status: "pending" | "funded" | "held" | "released" | "refunded" | "disputed";
  amount: number;
  currency: string;
  buyer_reference: string;
  seller_reference: string;
  created_at: string;
}

interface CreateEscrowParams {
  transactionReference: string;
  buyerEmail: string;
  sellerEmail: string;
  amountAed: number;
  description: string;
  milestones: Array<{
    id: string;
    name: string;
    percentage: number;
  }>;
  metadata?: Record<string, string>;
}

interface ReleaseFundsParams {
  escrowId: string;
  milestoneId: string;
  notes?: string;
}

interface RefundParams {
  escrowId: string;
  reason: string;
  notes?: string;
}

export interface KycSession {
  id: string;
  url: string;
  status: "pending" | "verified" | "rejected";
  rejection_reason?: string | null;
  created_at: string;
}

interface StartKycParams {
  /** Your internal dealer_profile ID — stored in metadata for webhook correlation */
  dealerProfileId: string;
  email: string;
  businessName: string;
  tradeLicenseNumber?: string | null;
  /** URL TrustIn redirects back to after the KYC form is complete */
  redirectUrl: string;
}

async function trustinFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${TRUSTIN_API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TRUSTIN_API_KEY}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(`TrustIn API error ${response.status}: ${error.message}`);
  }

  return response.json();
}

export const trustin = {
  /**
   * Create a new escrow transaction.
   * Called after Stripe payment is confirmed.
   */
  async createEscrow(params: CreateEscrowParams): Promise<TrustInEscrow> {
    return trustinFetch<TrustInEscrow>("/escrows", {
      method: "POST",
      body: JSON.stringify({
        reference: params.transactionReference,
        buyer: { email: params.buyerEmail },
        seller: { email: params.sellerEmail },
        amount: params.amountAed,
        currency: "AED",
        description: params.description,
        milestones: params.milestones,
        metadata: params.metadata ?? {},
      }),
    });
  },

  /**
   * Retrieve escrow status.
   */
  async getEscrow(escrowId: string): Promise<TrustInEscrow> {
    return trustinFetch<TrustInEscrow>(`/escrows/${escrowId}`);
  },

  /**
   * Release funds to seller when all milestones are complete.
   */
  async releaseFunds(params: ReleaseFundsParams): Promise<TrustInEscrow> {
    return trustinFetch<TrustInEscrow>(
      `/escrows/${params.escrowId}/release`,
      {
        method: "POST",
        body: JSON.stringify({
          milestone_id: params.milestoneId,
          notes: params.notes,
        }),
      }
    );
  },

  /**
   * Refund buyer — used when dispute resolves in buyer's favour.
   */
  async refund(params: RefundParams): Promise<TrustInEscrow> {
    return trustinFetch<TrustInEscrow>(
      `/escrows/${params.escrowId}/refund`,
      {
        method: "POST",
        body: JSON.stringify({
          reason: params.reason,
          notes: params.notes,
        }),
      }
    );
  },

  /**
   * Initiate KYC / AML / business verification for a dealer.
   * Returns a hosted TrustIn URL the dealer must visit to complete the flow.
   * Store the returned `id` as `dealer_profiles.trustin_kyc_id`.
   */
  async startKyc(params: StartKycParams): Promise<KycSession> {
    return trustinFetch<KycSession>("/kyc/sessions", {
      method: "POST",
      body: JSON.stringify({
        entity_type: "business",
        email: params.email,
        business_name: params.businessName,
        trade_license_number: params.tradeLicenseNumber ?? null,
        redirect_url: params.redirectUrl,
        metadata: { dealer_profile_id: params.dealerProfileId },
      }),
    });
  },

  /**
   * Retrieve the current status of a KYC session.
   * Use this to poll status or display current state in the UI.
   */
  async getKycStatus(kycId: string): Promise<KycSession> {
    return trustinFetch<KycSession>(`/kyc/sessions/${kycId}`);
  },

  /**
   * Verify a TrustIn webhook signature.
   * Uses HMAC-SHA256 with the webhook secret.
   */
  async verifyWebhook(
    rawBody: string,
    signature: string
  ): Promise<boolean> {
    const secret = process.env.TRUSTIN_WEBHOOK_SECRET ?? "";
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBytes = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(rawBody)
    );
    const expectedSig = Buffer.from(signatureBytes).toString("hex");
    return expectedSig === signature;
  },
};
