export const queryKeys = {
  member: () => ["member"] as const,
  notifications: () => ["notifications"] as const,
  history: () => ["history"] as const,
  upgradeTiers: () => ["upgradeTiers"] as const,
  pendingRequests: () => ["pending-requests"] as const,
  badges: () => ["badges"] as const,
  session: () => ["session"] as const,
  featureFlags: () => ["feature-flags"] as const,
  publicSettings: () => ["public-settings"] as const,
  upgradeRequest: (id: string) => ["upgrade-request", id] as const,
  receipts: (requestId: string) => ["receipts", requestId] as const,
};
