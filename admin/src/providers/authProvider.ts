import type { AuthProvider } from "@refinedev/core";
import {
  ApiError,
  clearSession,
  getCurrentMember,
  getSession,
  sendOtp,
  verifyOtp,
} from "@/lib/api";

/** Laravel parallel: separate admin login + isadmin middleware */
export const authProvider: AuthProvider = {
  login: async ({ email, otp }) => {
    try {
      if (otp) {
        await verifyOtp(String(email), String(otp));
      } else {
        await sendOtp(String(email));
        return {
          success: true,
          redirectTo: `/login?email=${encodeURIComponent(String(email))}&step=otp`,
        };
      }

      const member = await getCurrentMember();
      if (member.role !== "admin") {
        clearSession();
        return {
          success: false,
          error: {
            name: "Forbidden",
            message: "This account does not have HQ admin access.",
          },
        };
      }

      return { success: true, redirectTo: "/" };
    } catch (e) {
      const message = e instanceof ApiError ? e.message : "Login failed";
      return {
        success: false,
        error: { name: "LoginError", message },
      };
    }
  },

  logout: async () => {
    clearSession();
    return { success: true, redirectTo: "/login" };
  },

  check: async () => {
    const session = getSession();
    if (!session?.token) {
      return { authenticated: false, redirectTo: "/login" };
    }
    try {
      const member = await getCurrentMember();
      if (member.role !== "admin") {
        clearSession();
        return { authenticated: false, redirectTo: "/login" };
      }
      return { authenticated: true };
    } catch {
      clearSession();
      return { authenticated: false, redirectTo: "/login" };
    }
  },

  getPermissions: async () => {
    try {
      const member = await getCurrentMember();
      return member.role === "admin" ? ["admin"] : [];
    } catch {
      return [];
    }
  },

  getIdentity: async () => {
    try {
      const member = await getCurrentMember();
      return {
        id: member.id,
        name: member.name,
        email: member.email,
        avatar: undefined,
      };
    } catch {
      return null;
    }
  },

  onError: async (error) => {
    if (error?.statusCode === 401 || error?.statusCode === 403) {
      return { logout: true, redirectTo: "/login" };
    }
    return { error };
  },
};
