import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../state/SessionContext";
import { useDoctors } from "../lib/firestore";

export default function Identify() {
  const nav = useNavigate();
  const { setActor } = useSession();
  const { doctors, loading } = useDoctors();
  
  const activeDoctors = useMemo(() => doctors.filter(d => d.active), [doctors]);
  const [doctorId, setDoctorId] = useState("");

  useEffect(() => {
    if (activeDoctors.length > 0 && !doctorId) setDoctorId(activeDoctors[0].id);
  }, [activeDoctors, doctorId]);

  function confirm() {
    const d = activeDoctors.find(d => d.id === doctorId);
    if (d) { setActor({ doctorId, doctorName: d.name }); nav("/draw"); }
  }

  if (loading) return <div className="card">Carregando...</div>;

  return (
    <div className="stack">
      <div className="card">
        <h1 className="h1">Quem é você?</h1>
        <div className="field">
          <label>Médico</label>
          <select value={doctorId} onChange={e => setDoctorId(e.target.value)}>
            {activeDoctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div className="hr" />
        <button className="btn primary" onClick={confirm} disabled={!doctorId}>Confirmar</button>
      </div>
    </div>
  );
}