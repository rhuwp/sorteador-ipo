import { useState, useEffect } from "react";
import { db } from "../firebase";
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  orderBy,
  limit // <--- Importante para otimização
} from "firebase/firestore";

// --- TIPAGENS (Interfaces) ---

export type EventType = "DRAW" | "INDICATION";

export interface Doctor {
  id: string;
  name: string;
  areas: string[];
  active: boolean;       // Se está ativo no hospital
  canBeSelected: boolean; // Se atende Unimed
}

export interface DrawEvent {
  id: string;
  type: EventType;
  area: string;
  actorDoctorId: string;
  actorDoctorName: string;
  resultDoctorId: string;
  resultDoctorName: string;
  eligibleDoctorIds: string[];
  createdAt: string;
}

// --- HOOKS (Leitura em Tempo Real) ---

export function useDoctors() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Busca todos os médicos
    const q = query(collection(db, "doctors"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Doctor[];
      
      // Ordenação alfabética por nome
      data.sort((a, b) => a.name.localeCompare(b.name));
      
      setDoctors(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { doctors, loading };
}

export function useEvents() {
  const [events, setEvents] = useState<DrawEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // impede que o app consuma todo o plano gratuito do Firebase.
    const q = query(
      collection(db, "events"), 
      orderBy("createdAt", "desc"),
      limit(200) 
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const d = doc.data();
        
        
        let createdStr = new Date().toISOString();
        
        
        if (typeof d.createdAt === 'string') {
            createdStr = d.createdAt;
        } 
        
        else if (d.createdAt?.toDate) {
            createdStr = d.createdAt.toDate().toISOString();
        }

        return {
          id: doc.id,
          type: d.type,
          area: d.area,
          actorDoctorId: d.actorDoctorId,
          actorDoctorName: d.actorDoctorName,
          resultDoctorId: d.resultDoctorId,
          resultDoctorName: d.resultDoctorName,
          eligibleDoctorIds: d.eligibleDoctorIds,
          createdAt: createdStr
        };
      }) as DrawEvent[];
      
      setEvents(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { events, loading };
}

// --- AÇÕES (Escrita) ---

export async function addDoctorToFire(data: Omit<Doctor, "id">) {
  await addDoc(collection(db, "doctors"), data);
}

export async function updateDoctorInFire(id: string, data: Partial<Doctor>) {
  const ref = doc(db, "doctors", id);
  await updateDoc(ref, data);
}

export async function deleteDoctorFromFire(id: string) {
  const ref = doc(db, "doctors", id);
  await deleteDoc(ref);
}

export async function saveEventToFire(data: Omit<DrawEvent, "id" | "createdAt">) {
  await addDoc(collection(db, "events"), {
    ...data,
    createdAt: new Date().toISOString() // Salva sempre como string ISO para facilitar
  });
}