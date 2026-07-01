export interface PaymentReceipt {
  id: string;
  upgrade_request_id: string;
  member_id: string;
  file_url: string;
  file_type: "pdf" | "image";
  amount_claimed: number;
  member_note?: string | null;
  status: "PENDING_REVIEW" | "ACCEPTED" | "REJECTED";
  admin_note?: string | null;
  submitted_at: string;
}

export interface UpgradeRequestDetail {
  id: string;
  from_tier: string;
  to_tier: string;
  status: string;
  total_amount: number;
  amount_paid: number;
  admin_notes?: string | null;
  created_at?: string;
}
