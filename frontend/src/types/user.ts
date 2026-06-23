export type Tier = "Explorer" | "Pioneer" | "Vanguard";

export interface Member {
  id: string;
  email: string;
  name: string;
  subtitle: string;
  tier: Tier;
  clearance: string;
  status: string;
  joined: string;
  avatarUrl: string;
}
