import { useMemo, useState } from "react";
import { AREAS } from "../data/seed";
import { useSession } from "../state/SessionContext";
import { useDoctors, useEvents, saveEventToFire, EventType, Doctor } from "../lib/firestore";

function getEligibleDoctors(
  doctors: Doctor[], 
  area: string, 
  actorDoctorId: string | null,
  isUnimedPatient: boolean
) {
  return doctors.filter(d => {
    // 1. Ativo?
    if (!d.active) return false;
    
    // 2. Área correta?
    if (!d.areas.includes(area)) return false;
    
    // 3. Não pode sortear a si mesmo
    if (actorDoctorId && d.id === actorDoctorId) return false;
    
    // 4. Filtro UNIMED
    if (isUnimedPatient && !d.canBeSelected) return false;

    return true;
  });
}

export default function Draw() {
  const { mode, actor } = useSession();
  
  const { doctors, loading: loadingDocs } = useDoctors();
  const { events, loading: loadingEvents } = useEvents();

  const [area, setArea] = useState<string | null>(null);
  const [type, setType] = useState<EventType>("DRAW");
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  
  const [isUnimedPatient, setIsUnimedPatient] = useState(false); 
  const [isSaving, setIsSaving] = useState(false);

  const [preview, setPreview] = useState<{
    type: EventType;
    area: string;
    resultDoctorId: string;
    resultDoctorName: string;
    eligibleIds: string[];
    saved?: boolean;
  } | { error: string } | null>(null);

  const loading = loadingDocs || loadingEvents;

  const eligible = useMemo(() => {
    if (!area || loading) return [];
    const actorId = mode === "medicos" ? (actor?.doctorId ?? null) : null;
    return getEligibleDoctors(doctors, area, actorId, isUnimedPatient);
  }, [doctors, area, actor, mode, loading, isUnimedPatient]);

  function selectArea(a: string) {
    setArea(a); 
    setSelectedDoctorId(null); 
    setPreview(null);
  }

  // --- LÓGICA DE SORTEIO BALANCEADO ---
  function executeDraw() {
    if (!area || eligible.length === 0) {
      setPreview({ error: "Sem médicos elegíveis para os filtros atuais." });
      return;
    }
    
    // 1. Histórico da área (Draw e Indication contam)
    const areaHistory = events.filter(e => 
      (e.type === "DRAW" || e.type === "INDICATION") && 
      e.area === area
    );
    
    // 2. Contar quantas vezes cada elegível já participou
    const counts: Record<string, number> = {};
    eligible.forEach(d => { counts[d.id] = 0; });
    
    areaHistory.forEach(e => {
      if (counts[e.resultDoctorId] !== undefined) {
        counts[e.resultDoctorId]++;
      }
    });

    // 3. Menor número de participações
    const currentCounts = eligible.map(d => counts[d.id]);
    const minCount = Math.min(...currentCounts);
    
    // 4. Candidatos empatados
    const candidates = eligible.filter(d => counts[d.id] === minCount);

    // 5. Sorteio
    const winner = candidates[Math.floor(Math.random() * candidates.length)];
    
    setPreview({ 
      type: "DRAW", 
      area, 
      resultDoctorId: winner.id, 
      resultDoctorName: winner.name,
      eligibleIds: eligible.map(d => d.id) 
    });
  }

  function executeIndication() {
    if (!area || !selectedDoctorId) return;
    const doc = doctors.find(d => d.id === selectedDoctorId);
    setPreview({ 
      type: "INDICATION", 
      area, 
      resultDoctorId: selectedDoctorId, 
      resultDoctorName: doc?.name ?? "Desconhecido",
      eligibleIds: eligible.map(d => d.id) 
    });
  }

  async function save() {
    if (!preview || "error" in preview) return;
    
    setIsSaving(true);
    try {
      const actorDoctorId = mode === "medicos" ? (actor?.doctorId ?? "UNKNOWN") : "ADMIN";
      const actorDoctorName = mode === "medicos" ? (actor?.doctorName ?? "Médico") : "Admin";
      
      await saveEventToFire({
        type: preview.type,
        area: preview.area,
        actorDoctorId, 
        actorDoctorName,
        resultDoctorId: preview.resultDoctorId, 
        resultDoctorName: preview.resultDoctorName,
        eligibleDoctorIds: preview.eligibleIds,
      });

      setPreview({ ...preview, saved: true });
      
      setTimeout(() => { 
        setArea(null); 
        setSelectedDoctorId(null); 
        setPreview(null); 
        setIsSaving(false); 
      }, 2000);
      
    } catch { 
      alert("Erro ao salvar."); 
      setIsSaving(false); 
    }
  }

  if (loading) return <div className="card"><p>Carregando sistema...</p></div>;

  return (
    <div className="stack">
      <div className="card">
        <h1 className="h1">{mode === "medicos" ? "Sorteio" : "Sorteio / Indicação"}</h1>
        
        {mode === "admin" && (
          <div className="field">
            <label>Modo</label>
            <select value={type} onChange={(e) => setType(e.target.value as any)}>
              <option value="DRAW">Sorteio (Aleatório)</option>
              <option value="INDICATION">Indicação Manual</option>
            </select>
            <div className="hr" />
          </div>
        )}

        {preview && !("error" in preview) && !preview.saved && (
          <div className="notice err" style={{ marginBottom: 16 }}>
            Salve o resultado antes de continuar.
          </div>
        )}

        {/* Checkbox Unimed */}
        <div className="field" style={{ marginBottom: 20 }}>
          <label style={{ 
            display: "flex", alignItems: "center", gap: "12px", 
            padding: "16px", background: "#f8f9fa", borderRadius: "8px", border: "1px solid #e9ecef",
            cursor: "pointer"
          }}>
            <input 
              type="checkbox" 
              checked={isUnimedPatient} 
              onChange={e => setIsUnimedPatient(e.target.checked)}
              disabled={!!(preview && !("error" in preview) && !preview.saved)}
              style={{ width: 20, height: 20, cursor: "pointer" }}
            />
            <div>
              <span style={{ fontWeight: 600, display: "block", fontSize: 15 }}>Paciente é UNIMED?</span>
              <span style={{ fontSize: 13, color: "#666" }}>
                {isUnimedPatient 
                  ? "Sorteio restrito apenas a médicos credenciados." 
                  : "Todos os médicos da escala participam."}
              </span>
            </div>
          </label>
        </div>

        <h3>1. Selecione a área</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
          {AREAS.filter(a => a !== "Indicador Apenas").map(a => (
            <button 
              key={a} 
              className={`btn ${area === a ? "primary" : ""}`} 
              onClick={() => selectArea(a)} 
              disabled={!!(preview && !("error" in preview) && !preview.saved)}
            >
              {a}
            </button>
          ))}
        </div>

        {area && eligible.length > 0 && (
          <>
            <div className="hr" />
            
            <h3>2. {type === "DRAW" ? "Execute" : "Selecione o Médico"}</h3>
            
            {type === "DRAW" ? (
              <div>
                <div className="notice" style={{ marginBottom: 12 }}>
                  {eligible.length} médico(s) disponíveis na fila de <strong>{area}</strong>.
                </div>
                <button 
                  className="btn primary" 
                  onClick={executeDraw} 
                  disabled={!!(preview && !("error" in preview) && !preview.saved)}
                >
                  Realizar Sorteio
                </button>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
                {eligible.map(d => (
                  <button 
                    key={d.id} 
                    className={`btn ${selectedDoctorId === d.id ? "primary" : ""}`} 
                    onClick={() => setSelectedDoctorId(d.id)} 
                    disabled={!!(preview && !("error" in preview) && !preview.saved)}
                  >
                    {d.name}
                  </button>
                ))}
              </div>
            )}
            
            {type === "INDICATION" && selectedDoctorId && (
              <button 
                className="btn primary" 
                onClick={executeIndication} 
                style={{ marginTop: 12 }} 
                disabled={!!(preview && !("error" in preview) && !preview.saved)}
              >
                Confirmar Indicação
              </button>
            )}
          </>
        )}

        {area && eligible.length === 0 && (
          <div className="notice err" style={{ marginTop: 12 }}>
            Nenhum médico disponível nesta área com os filtros atuais.
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="h1">Resultado</h2>
        
        {!preview && <div className="notice">Aguardando ação...</div>}
        
        {preview && "error" in preview && <div className="notice err">{preview.error}</div>}
        
        {preview && !("error" in preview) && (
          <div className="stack">
            <div style={{ 
              padding: 24, 
              background: "#f0fdf4", 
              border: "2px solid #86efac", 
              borderRadius: 8, 
              textAlign: "center" 
            }}>
              <div style={{ 
                fontSize: "14px", 
                fontWeight: "600", 
                color: "#166534",
                marginBottom: "8px",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                {preview.area}
              </div>

              <div style={{ 
                fontSize: "26px", 
                fontWeight: "800", 
                color: "#15803d",
                marginBottom: "8px",
                lineHeight: "1.2"
              }}>
                {preview.resultDoctorName}
              </div>
              
              <div style={{ fontSize: "15px", color: "#166534" }}>
                {preview.type === "DRAW" ? "Sorteado com sucesso" : "Indicação registrada"}
              </div>
            </div>

            {!preview.saved ? (
              <button 
                className="btn primary" 
                onClick={save} 
                disabled={isSaving} 
                style={{ width: "100%", padding: 14 }}
              >
                {isSaving ? "Salvando..." : "Salvar no Histórico"}
              </button>
            ) : (
              <div className="notice ok">Salvo com sucesso!</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}