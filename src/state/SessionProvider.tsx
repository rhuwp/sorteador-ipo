import { useState, useEffect, ReactNode } from "react";
import { auth } from "../firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { SessionContext, Mode, Actor } from "./SessionContext";

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