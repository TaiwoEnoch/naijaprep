import { create } from "zustand";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "student" | "teacher" | "admin";
  examType?: "WAEC" | "NECO" | "JAMB";
  streak: number;
  isPremium: boolean;
}

interface AppState {
  user: User | null;
  isOnline: boolean;
  setUser: (user: User | null) => void;
  setOnline: (isOnline: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: {
    id: "usr_default",
    name: "Taiwo Enoch",
    email: "taiwo@naijaprep.com",
    role: "student",
    examType: "JAMB",
    streak: 3,
    isPremium: false,
  }, // initial default state for hydrated dev layout
  isOnline: true,
  setUser: (user) => set({ user }),
  setOnline: (isOnline) => set({ isOnline }),
}));
