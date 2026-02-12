import { createContext, useContext } from "react";
import { User } from "firebase/auth";

export type Mode = "admin" | "medicos" | null;

export interface Actor {
  doctorId: string;
  doctorName: string;
}

export interface SessionContextValue {
  user: User | null; // Usuário real do Firebase
  mode: Mode;
  actor: Actor | null;
  setActor: (actor: Actor | null) => void;
  logout: () => void;
  loadingSession: boolean;
}

export const SessionContext = createContext<SessionContextValue>({} as any);

export function useSession() {
  return useContext(SessionContext);
}