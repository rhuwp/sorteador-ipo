import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { auth } from "../firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";

type Mode = "admin" | "medicos" | null;

interface Actor {
  doctorId: string;
  doctorName: string;
}

interface SessionContextValue {
  user: User | null; // Usuário real do Firebase
  mode: Mode;
  actor: Actor | null;
  setActor: (actor: Actor | null) => void;
  logout: () => void;
  loadingSession: boolean;
}

const SessionContext = createContext<SessionContextValue>({} as any);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState<Mode>(null);
  const [actor, setActor] = useState<Actor | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  useEffect(() => {
    
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
       
        if (firebaseUser.email?.includes("admin")) {
          setMode("admin");
        } else {
          setMode("medicos");
        }
      } else {
        setMode(null);
        setActor(null);
      }
      
      setLoadingSession(false);
    });

    return () => unsubscribe();
  }, []);

  function logout() {
    signOut(auth);
    setMode(null);
    setActor(null);
  }

  return (
    <SessionContext.Provider value={{ user, mode, actor, setActor, logout, loadingSession }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}