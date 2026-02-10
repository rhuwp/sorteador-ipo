import { useMemo, useState } from "react";
import { AREAS } from "../data/seed";
import { useSession } from "../state/SessionContext";
import { useDoctors, useEvents, saveEventToFire, EventType, Doctor } from "../lib/firestore";

// --- Função de Filtros ---
function getEligibleDoctors(
  doctors: Doctor[], 
  area: string, 
  actorDoctorId: string | null,
  isUnimedPatient: boolean
) {
  return doctors.filter(d => {
    // 1. O médico deve estar Ativo
    if (!d.active) return false;

    // 2. Deve ser da Área selecionada
    if (!d.areas.includes(area)) return false;

    // 3. Não pode ser o próprio médico logado (se for totem)
    if (actorDoctorId && d.id === actorDoctorId) return false;

    // 4. Filtro de Convênio
    if (isUnimedPatient && !d.canBeSelected) return false;

    return true;
  });
}

export default function Draw() {
  const { mode, actor } = useSession();
  
  // Hooks do Firebase
  const { doctors, loading: loadingDocs } = useDoctors();
  const { events, loading: loadingEvents } = useEvents();

  // Estados
  const [area, setArea] = useState<string | null>(null);
  const [type, setType] = useState<EventType>("DRAW");
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [isUnimedPatient, setIsUnimedPatient] = useState(false); 
  const [isSaving, setIsSaving] = useState(false);

  // Preview
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

  // --- LÓGICA DE RODÍZIO POR DATA (Considerando INDICAÇÃO) ---
  function executeDraw() {
    if (!area || eligible.length === 0) {
      setPreview({ error: "Sem médicos elegíveis." });
      return;
    }
    
    // 1. Mapa de Última Vez (Timestamp)
    const lastDates: Record<string, number> = {};
    
    // Inicializa todos com 0 (Nunca participou = Prioridade Máxima)
    eligible.forEach(d => { lastDates[d.id] = 0; });

    // O histórico (events) vem do mais novo para o mais antigo.
    // A primeira vez que o médico aparece na lista, é a última vez dele.
    for (const event of events) {
      // Ignora eventos de outras áreas
      if (event.area !== area) continue;

      const docId = event.resultDoctorId;
      
      // IMPORTANTE: Aqui consideramos TANTO Sorteio (DRAW) quanto Indicação (INDICATION).
      // Se o médico foi indicado manualmente pelo Admin, conta como "Vez Usada".
      if (lastDates[docId] !== undefined && lastDates[docId] === 0) {
        lastDates[docId] = new Date(event.createdAt).getTime();
      }
    }

    // 2. Quem tem a data mais antiga? (Ou quem tem 0)
    // 0 ganha de 2024. Ontem ganha de Hoje.
    const timestamps = eligible.map(d => lastDates[d.id]);
    const minTimestamp = Math.min(...timestamps);

    // 3. Selecionar os candidatos da vez (Fila prioritária)
    const candidates = eligible.filter(d => lastDates[d.id] === minTimestamp);

    // 4. Sorteio de desempate
    const winnerIndex = Math.floor(Math.random() * candidates.length);
    const winner = candidates[winnerIndex];
    
    if (!winner) {
      setPreview({ error: "Erro no processamento." });
      return;
    }

    setPreview({ 
      type: "DRAW", 
      area, 
      resultDoctorId: winner.id, 
      resultDoctorName: winner.name,
      eligibleIds: eligible.map(d => d.id) 
    });
  }

  // Indicação Manual (Admin)
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

  // Salvar
  async function save() {
    if (!preview || "error" in preview) return;
    setIsSaving(true);
    try {
      await saveEventToFire({
        type: preview.type,
        area: preview.area,
        actorDoctorId: mode === "medicos" ? (actor?.doctorId ?? "UNKNOWN") : "ADMIN", 
        actorDoctorName: mode === "medicos" ? (actor?.doctorName ?? "Médico") : "Admin",
        resultDoctorId: preview.resultDoctorId, 
        resultDoctorName: preview.resultDoctorName,
        eligibleDoctorIds: preview.eligibleIds,
      });

      setPreview({ ...preview, saved: true });
      setTimeout(() => { setArea(null); setSelectedDoctorId(null); setPreview(null); setIsSaving(false); }, 2000);
    } catch { alert("Erro ao salvar."); setIsSaving(false); }
  }

  if (loading) return <div className="card"><p>Carregando sistema...</p></div>;

  return (
    <div className="stack">
      <div className="card">
        <h1 className="h1">{mode === "medicos" ? "Sorteio" : "Sorteio / Indicação"}</h1>
        
        {/* Seletor de Modo (Admin) */}
        {mode === "admin" && (
          <div className="field">
            <label>Modo</label>
            <select value={type} onChange={(e) => setType(e.target.value as any)}>
              <option value="DRAW">Sorteio (Rodízio)</option>
              <option value="INDICATION">Indicação Manual</option>
            </select>
            <div className="hr" />
          </div>
        )}

        {preview && !("error" in preview) && !preview.saved && (
          <div className="notice err" style={{ marginBottom: 16 }}>
            Confirme o resultado para atualizar a fila.
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
                  ? "Apenas credenciados entram na fila." 
                  : "Todos os médicos da área participam."}
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
                  {eligible.length} médico(s) na fila de <strong>{area}</strong>.
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
                {preview.type === "DRAW" ? "Vez no Rodízio" : "Indicação registrada"}
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