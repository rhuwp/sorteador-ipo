import { useState } from "react";
// Importa Tipos e Funções do Firestore
import { 
  useDoctors, 
  addDoctorToFire, 
  updateDoctorInFire, 
  deleteDoctorFromFire,
  Doctor 
} from "../lib/firestore";
// Importa apenas as Áreas
import { AREAS } from "../data/seed";

export default function Admin() {
  const { doctors, loading } = useDoctors();
  
  // Estados do Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Campos do Formulário
  const [name, setName] = useState("");
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [attendsUnimed, setAttendsUnimed] = useState(true);
  const [isActive, setIsActive] = useState(true);
  
  // Estados de UI
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // --- Funções de Ação ---

  async function toggleStatus(id: string, current: boolean) {
    await updateDoctorInFire(id, { active: !current });
  }

  function handleOpenNew() {
    setEditingId(null);
    setName("");
    setSelectedAreas([]);
    setAttendsUnimed(true);
    setIsActive(true);
    setError("");
    setIsModalOpen(true);
  }

  function handleOpenEdit(doctor: Doctor) {
    setEditingId(doctor.id);
    setName(doctor.name);
    setSelectedAreas(doctor.areas);
    setAttendsUnimed(doctor.canBeSelected);
    setIsActive(doctor.active);
    setError("");
    setIsModalOpen(true);
  }

  function toggleArea(area: string) {
    if (selectedAreas.includes(area)) {
      setSelectedAreas(selectedAreas.filter(a => a !== area));
    } else {
      setSelectedAreas([...selectedAreas, area]);
    }
    setError("");
  }

  async function handleSave() {
    if (!name.trim()) { setError("Por favor, digite o nome."); return; }
    if (selectedAreas.length === 0) { setError("Selecione ao menos uma área."); return; }

    setIsSaving(true);
    try {
      const doctorData = {
        name: name.trim(),
        areas: selectedAreas,
        active: isActive,
        canBeSelected: attendsUnimed,
      };

      if (editingId) {
        await updateDoctorInFire(editingId, doctorData);
      } else {
        await addDoctorToFire(doctorData);
      }
      
      setIsModalOpen(false);
    } catch (e) {
      console.error(e); 
      setError("Erro ao salvar.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleDeleteClick(id: string) {
    if (confirmDeleteId === id) {
      deleteDoctorFromFire(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(curr => curr === id ? null : curr), 5000);
    }
  }

  if (loading) return <div className="card"><p>Carregando...</p></div>;

  return (
    <div className="stack">
      {/* Cabeçalho */}
      <div className="card">
        <div className="nav" style={{ marginBottom: 0 }}>
          <div>
            <h1 className="h1" style={{ marginBottom: 4 }}>Admin</h1>
            <p className="muted" style={{ margin: 0 }}>{doctors.length} médicos cadastrados</p>
          </div>
          <button className="btn primary" onClick={handleOpenNew}>
            + Novo Médico
          </button>
        </div>
      </div>

      {/* Tabela de Médicos */}
      <div className="card" style={{ overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Áreas</th>
              <th>Unimed</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {doctors.map((d: Doctor) => (
              <tr key={d.id} style={{ opacity: d.active ? 1 : 0.6 }}>
                <td style={{ fontWeight: 500 }}>{d.name}</td>
                <td className="muted" style={{ fontSize: 13 }}>{d.areas.join(", ")}</td>
                
                {/* Coluna UNIMED */}
                <td>
                  <span style={{ fontWeight: 500, color: d.canBeSelected ? "#15803d" : "#991b1b" }}>
                    {d.canBeSelected ? "Sim" : "Não"}
                  </span>
                </td>

                {/* Coluna STATUS */}
                <td>
                  <button 
                    className={`btn ${!d.active ? "primary" : ""}`}
                    onClick={() => toggleStatus(d.id, d.active)}
                    style={{ fontSize: 12, padding: "6px 12px" }}
                  >
                    {d.active ? "Desativar" : "Ativar"}
                  </button>
                </td>

                {/* Coluna AÇÕES */}
                <td style={{ textAlign: "right" }}>
                  <div className="hstack" style={{ justifyContent: "flex-end", gap: 8 }}>
                    <button 
                      className="btn"
                      onClick={() => handleOpenEdit(d)}
                      style={{ fontSize: 12, padding: "6px 12px", border: "1px solid #aaa" }}
                    >
                      Editar
                    </button>
                    <button 
                      className="btn"
                      onClick={() => handleDeleteClick(d.id)}
                      style={{ 
                        fontSize: 12, padding: "6px 12px",
                        backgroundColor: confirmDeleteId === d.id ? "#fee2e2" : "#fff",
                        color: confirmDeleteId === d.id ? "#b91c1c" : "#666",
                        borderColor: confirmDeleteId === d.id ? "#fca5a5" : "#ddd",
                        fontWeight: confirmDeleteId === d.id ? "bold" : "normal",
                        minWidth: "70px"
                      }}
                    >
                      {confirmDeleteId === d.id ? "Confirmar?" : "Excluir"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {doctors.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: "center", padding: 20 }}>Nenhum médico cadastrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* --- MODAL (Criar / Editar) --- */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="h1" style={{ marginTop: 0 }}>
              {editingId ? "Editar Médico" : "Novo Médico"}
            </h2>
            
            <div className="stack" style={{ gap: 20 }}>
              
              {/* Campo Nome */}
              <div className="field">
                <label>Nome Completo</label>
                <input 
                  autoFocus 
                  value={name} onChange={e => setName(e.target.value)}
                  placeholder="Ex: Dr. João Silva" style={{ fontSize: 16 }}
                />
              </div>

              {/* Campo Áreas */}
              <div className="field">
                <label>Áreas de Atuação</label>
                <div className="areas-grid">
                  {AREAS.filter(a => a !== "Indicador Apenas").map(area => (
                    <div 
                      key={area} onClick={() => toggleArea(area)}
                      className={`area-tag ${selectedAreas.includes(area) ? "selected" : ""}`}
                    >
                      {area}
                    </div>
                  ))}
                </div>
              </div>

              {/* Checkbox: Cadastro Ativo */}
              <div className="field">
                 <label style={{ display: "flex", gap: "10px", cursor: "pointer", padding: "8px 0" }}>
                  <input 
                    type="checkbox" checked={isActive} 
                    onChange={e => setIsActive(e.target.checked)} 
                    style={{ width: "20px", height: "20px", margin: 0 }}
                  />
                  <span style={{ fontSize: "15px" }}>Cadastro Ativo</span>
                </label>
              </div>

              {/* Checkbox: Unimed */}
              <div className="field">
                <label style={{ 
                  display: "flex", alignItems: "center", gap: "12px", cursor: "pointer",
                  padding: "12px", border: "1px solid #ddd", borderRadius: "8px", background: "#fdfdfd"
                }}>
                  <input 
                    type="checkbox" checked={attendsUnimed} 
                    onChange={e => setAttendsUnimed(e.target.checked)} 
                    style={{ width: "20px", height: "20px", cursor: "pointer", margin: 0 }}
                  />
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: 15, fontWeight: 500 }}>
                      Atende e opera pela UNIMED?
                    </span>
                    <span style={{ fontSize: 12, color: "#666" }}>
                      Habilita participação no sorteio
                    </span>
                  </div>
                </label>
              </div>

              {error && <div className="notice err">{error}</div>}

              <div className="hstack" style={{ justifyContent: "flex-end" }}>
                <button className="btn" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button className="btn primary" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? "Salvando..." : (editingId ? "Atualizar" : "Criar")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}