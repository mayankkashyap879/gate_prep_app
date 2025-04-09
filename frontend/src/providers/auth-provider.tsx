"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { authAPI, isAuthenticated, removeToken } from "@/lib/api";

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  deadline: string;
  selectedPlan?: string;
  dailyTarget?: {
    minimum: number;
    moderate: number;
    maximum: number;
    custom: number;
    [key: string]: number;
  };
  selectedSubjects?: string[] | any[];
  subjectPriorities?: { [key: string]: number };
  createdAt: string;
  totalStudyTime?: number;
  streak?: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isLoggedIn: boolean;
  isAdmin: boolean;
  logout: () => void;
  refreshUser: () => Promise<boolean | void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isLoggedIn: false,
  isAdmin: false,
  logout: () => {},
  refreshUser: async () => {
    return false;
  },
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Define which routes require authentication or are for authentication only
  const authRoutes = ["/login", "/register"];
  const isAuthRoute = authRoutes.includes(pathname);
  const isAdminLoginRoute = pathname === "/admin-login";
  const isAdminRoute = pathname.startsWith("/admin") && !isAdminLoginRoute;
  const isDashboardRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/subjects") ||
    pathname.startsWith("/tests") ||
    pathname.startsWith("/quizzes") ||
    pathname.startsWith("/calendar") ||
    pathname.startsWith("/timer") ||
    pathname.startsWith("/leaderboard") ||
    pathname.startsWith("/progress") ||
    pathname.startsWith("/settings") ||
    isAdminRoute;

  // Fetch user information from API
  const fetchUser = async (): Promise<boolean> => {
    try {
      console.log("Fetching user – authenticated check:", isAuthenticated());
      if (isAuthenticated()) {
        try {
          const userData = await authAPI.getCurrentUser();
          console.log("User data fetched successfully:", userData);
          if (userData && userData._id) {
            setUser(userData);
            return true;
          } else {
            console.error("Invalid user data returned:", userData);
            removeToken();
            return false;
          }
        } catch (error: any) {
          console.error("Error fetching user:", error);
          if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            console.warn("Authentication error, clearing token");
            removeToken();
          }
          return false;
        }
      }
      return false;
    } catch (error) {
      console.error("Error checking auth:", error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Refresh user data when needed
  const refreshUser = async () => {
    try {
      if (isAuthenticated()) {
        try {
          const userData = await authAPI.getCurrentUser();
          if (userData && userData._id) {
            setUser(userData);
            return true;
          } else {
            console.error("Invalid user data returned during refresh:", userData);
            return false;
          }
        } catch (fetchError: any) {
          console.error("Error fetching user during refresh:", fetchError);
          if (fetchError.response && (fetchError.response.status === 401 || fetchError.response.status === 403)) {
            console.warn("Authentication error during refresh, clearing token");
            removeToken();
          }
          return false;
        }
      } else {
        console.warn("Cannot refresh user: not authenticated");
        return false;
      }
    } catch (error: any) {
      console.error("Unexpected error refreshing user:", error);
      return false;
    }
  };

  // Handle logout action
  const logout = () => {
    removeToken();
    setUser(null);
    router.push("/login");
  };

  // Check authentication status when pathname changes.
  // Notice: We removed "user" from the dependency array and added an extra check
  // to avoid calling router.push if we’re already on the target route.
  useEffect(() => {
    async function checkAuth() {
      const loggedIn = await fetchUser();
      // If not logged in and trying to access secure areas, redirect to login.
      if (!loggedIn && isDashboardRoute && pathname !== "/login") {
        router.push("/login");
      }
      // If logged in and on an auth-only route, redirect to dashboard.
      else if (loggedIn && isAuthRoute && pathname !== "/dashboard") {
        router.push("/dashboard");
      }
      // If on admin routes without proper role, force redirect to dashboard.
      else if (loggedIn && isAdminRoute && user?.role !== "admin" && pathname !== "/dashboard") {
        router.push("/dashboard");
      }
    }

    checkAuth();
  }, [pathname, isAuthRoute, isDashboardRoute, isAdminRoute, router]); // Notice user removed from dependency

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isLoggedIn: !!user,
        isAdmin: !!user && user.role === "admin",
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
