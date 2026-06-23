export type User = { id: number; email: string; name: string };
export type ApiResponse<T> = { data: T; success: boolean };
