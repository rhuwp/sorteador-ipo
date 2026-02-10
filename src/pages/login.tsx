import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      
      if (user.email?.includes("admin")) {
        nav("/admin");
      } else {
        
        nav("/identify");
      }
    } catch (err: any) {
      console.error(err);
      setError("Email ou senha inválidos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="stack" style={{ maxWidth: "400px", margin: "40px auto" }}>
      <div className="card" style={{ textAlign: "center" }}>
        <h1 className="h1" style={{ marginBottom: "8px" }}>Hospital IPO</h1>
        <p className="muted" style={{ marginBottom: "24px" }}>Acesso ao Sistema de Sorteio</p>
        
        <form onSubmit={handleLogin} className="stack">
          <div className="field">
            <label style={{textAlign: "left"}}>Email Institucional</label>
            <input 
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="ex: totem@ipo.com"
              required
            />
          </div>

          <div className="field">
            <label style={{textAlign: "left"}}>Senha</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••"
              required
            />
          </div>

          {error && <div className="notice err">{error}</div>}

          <button 
            type="submit"
            className="btn primary" 
            disabled={loading}
            style={{ marginTop: "8px", padding: "12px" }}
          >
            {loading ? "Entrando..." : "Acessar Sistema"}
          </button>
        </form>

        <div className="hr" />
        <p className="muted" style={{ fontSize: "12px" }}>
          Use <strong>admin@ipo.com</strong> para gerência ou <br/>
          <strong>totem@ipo.com</strong> para estação dos médicos.
        </p>
      </div>
    </div>
  );
}