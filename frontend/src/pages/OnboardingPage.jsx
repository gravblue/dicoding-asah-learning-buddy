import { Link, useNavigate } from "react-router-dom";
import { useState, useMemo, useEffect } from "react";
import { Backend } from "../lib/backend";

const ROLE_SKILLS = {
  "Frontend Developer": ["HTML/CSS", "JavaScript", "React", "State Management", "Testing", "Accessibility", "Design System"],
  "Backend Developer": ["API Design", "Database", "Authentication", "Caching", "Testing", "Cloud Deployment"],
  "Machine Learning Engineer": ["Python", "Data Preprocessing", "Modeling", "Evaluation", "Deployment", "Feature Engineering", "MLOps"],
  "Data Analyst": ["SQL", "Data Cleaning", "Visualization", "Statistics", "Storytelling", "Business Communication", "Dashboarding"],
};

function uniq(list) {
  return Array.from(new Set(list.filter(Boolean)));
}

export default function OnboardingPage() {
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState("");
  const [experience, setExperience] = useState("");
  const [goal, setGoal] = useState("");
  const [skillText, setSkillText] = useState("");
  const [analysis, setAnalysis] = useState([]); // hasil ML
  const [analysisInfo, setAnalysisInfo] = useState("");
  const [customSkill, setCustomSkill] = useState("");
  const [scores, setScores] = useState({}); // subskill -> 0..100
  const [loadingML, setLoadingML] = useState(false);
  const baseSkills = useMemo(() => ROLE_SKILLS[role] || [], [role]);
  const subskills = useMemo(() => uniq([...baseSkills, ...analysis.map((a) => a.name), ...Object.keys(scores)]), [baseSkills, analysis, scores]);

  useEffect(() => {
    // reset scores when role change
    setScores((prev) => {
      const filtered = {};
      for (const key of subskills) {
        if (prev[key] != null) filtered[key] = prev[key];
      }
      return filtered;
    });
  }, [role]);

  const analyze = async () => {
    if (!skillText.trim()) {
      setAnalysisInfo("Tuliskan dulu aktivitas belajarmu supaya bisa dianalisa.");
      return;
    }
    setLoadingML(true);
    setAnalysisInfo("");
    try {
      const res = await Backend.extractSkills(skillText);
      const detected = res.skills || [];
      if (detected.length) {
        setAnalysis(detected);
        setScores((prev) => {
          const updated = { ...prev };
          detected.forEach((item) => {
            if (updated[item.name] == null) updated[item.name] = Math.min(100, Math.round(item.score));
          });
          return updated;
        });
        setAnalysisInfo("Skill terdeteksi otomatis. Silakan sesuaikan nilainya di langkah berikutnya.");
      } else {
        setAnalysisInfo("Belum ada skill yang terdeteksi dari teks tersebut. Tambah manual ya.");
      }
    } catch (e) {
      console.error(e);
      // fallback sederhana: cocokan kata kunci dari role
      const fallbacks = (ROLE_SKILLS[role] || []).filter((s) => skillText.toLowerCase().includes(s.split(" ")[0].toLowerCase())).map((name) => ({ name, score: 70 }));
      if (fallbacks.length) {
        setAnalysis(fallbacks);
        setScores((prev) => {
          const updated = { ...prev };
          fallbacks.forEach((item) => {
            if (updated[item.name] == null) updated[item.name] = item.score;
          });
          return updated;
        });
        setAnalysisInfo("Analisis offline menggunakan template role karena koneksi API bermasalah.");
      } else {
        setAnalysisInfo("Analisis gagal karena backend belum berjalan. Jalankan `npm run dev` lalu coba lagi, atau tambahkan skill manual.");
      }
    } finally {
      setLoadingML(false);
    }
  };

  const addCustomSkill = () => {
    if (!customSkill.trim()) return;
    setScores((prev) => ({ ...prev, [customSkill.trim()]: prev[customSkill.trim()] ?? 0 }));
    setCustomSkill("");
  };

  const save = async (e) => {
    e.preventDefault();
    const data = { role, experience, goal, ts: Date.now() };
    try { localStorage.setItem("lb_onboarding", JSON.stringify(data)); } catch {}
    try { await Backend.saveOnboarding({ role, experience, goal }); } catch {}
    try {
      const items = Object.entries(scores).map(([subskill, score]) => ({ subskill, score: Number(score || 0) }));
      if (items.length) await Backend.submitAssessment({ role, items });
    } catch (err) {
      console.error(err);
    }
    nav("/register");
  };

  return (
    <div className="auth-wrap">
      <form className="card" onSubmit={save}>
        <h1>Onboarding</h1>

        {step === 1 && (
          <>
            <div className="field">
              <label>Pilih Job Role</label>
              <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="">Pilih salah satu</option>
                {Object.keys(ROLE_SKILLS).map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Level pengalaman saat ini</label>
              <select className="input" value={experience} onChange={(e) => setExperience(e.target.value)}>
                <option value="">Pilih level</option>
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </select>
            </div>
            <div className="field">
              <label>Tuliskan skill/aktivitas belajar terakhirmu</label>
              <textarea className="input" rows={4} placeholder="Contoh: 3 bulan terakhir fokus ke React dan testing" value={skillText} onChange={(e) => setSkillText(e.target.value)} />
              <button type="button" className="btn primary" style={{marginTop:8}} onClick={analyze} disabled={loadingML}>{loadingML ? "Menganalisis..." : "Analisis Skill"}</button>
              {analysisInfo && <div className="muted" style={{marginTop:8}}>{analysisInfo}</div>}
              {analysis.length > 0 && (
                <div style={{marginTop:8}}>
                  <div className="muted">Skill terdeteksi:</div>
                  <div style={{display:"flex", flexWrap:"wrap", gap:6, marginTop:6}}>
                    {analysis.map((a) => (
                      <span key={a.name} style={{padding:"4px 10px", borderRadius:999, background:"#e8edff", fontSize:12}}>{a.name} ({Math.round(a.score)})</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="actions">
              <button className="btn primary" type="button" disabled={!role || !experience} onClick={() => setStep(2)}>Lanjut</button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="field">
              <label>Tambah skill khusus (opsional)</label>
              <div style={{display:"flex", gap:8}}>
                <input className="input" placeholder="Contoh: GraphQL" value={customSkill} onChange={(e) => setCustomSkill(e.target.value)} />
                <button type="button" className="btn" onClick={addCustomSkill}>Tambah</button>
              </div>
            </div>
            <div className="field">
              <label>Nilai kemampuan per sub-skill (0-100)</label>
              {subskills.length === 0 && <div className="muted">Belum ada sub-skill. Isi analisis skill atau tambah manual.</div>}
              <div style={{display:"grid", gap:12}}>
                {subskills.map((s) => (
                  <div key={s} style={{display:"grid", gap:6}}>
                    <div style={{display:"flex", justifyContent:"space-between", fontSize:14}}>
                      <span>{s}</span>
                      <span>{scores[s] ?? 0}</span>
                    </div>
                    <input type="range" min={0} max={100} value={scores[s] ?? 0} onChange={(e) => setScores((prev) => ({ ...prev, [s]: Number(e.target.value) }))} />
                  </div>
                ))}
              </div>
            </div>
            <div className="actions">
              <button className="btn" type="button" onClick={() => setStep(1)}>Kembali</button>
              <button className="btn primary" type="button" onClick={() => setStep(3)} disabled={!subskills.length}>Lanjut</button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="field">
              <label>Tujuan 4–6 minggu ke depan</label>
              <input className="input" placeholder="Contoh: Kuasai React testing dan buat mini project" value={goal} onChange={(e) => setGoal(e.target.value)} />
            </div>
            <div className="field">
              <label>Ringkasan Skill</label>
              <ul style={{margin:0, paddingLeft:18}}>
                {Object.entries(scores).map(([name, score]) => (
                  <li key={name}>{name}: {score <= 33 ? "Beginner" : score <= 66 ? "Intermediate" : "Advanced"} ({score})</li>
                ))}
              </ul>
            </div>
            <div className="actions">
              <button className="btn" type="button" onClick={() => setStep(2)}>Kembali</button>
              <button className="btn primary" type="submit" disabled={!goal}>Simpan & Lanjut</button>
            </div>
          </>
        )}

        <div className="muted" style={{textAlign: "center", marginTop: 10}}>
          Sudah punya akun? <Link className="link" to="/login">Login</Link>
        </div>
      </form>
    </div>
  );
}
