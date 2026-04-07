import { useState, useEffect, useRef } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai"; // 1. Added Gemini SDK
import "./HealthForm.css";

// ─── Gemini Configuration ───────────────────────────────────────────────────
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY; 

// Check if the key exists to avoid silent crashes
if (!API_KEY) {
    console.error("Gemini API Key is missing! Check your .env file and restart the server.");
}
const genAI = new GoogleGenerativeAI(API_KEY);

// ─── Field schema for AI extraction ──────────────────────────────────────────
const FIELD_SCHEMA = `
Extract medical values from this report and return ONLY a JSON object.
Map found values to these exact keys (skip keys not found in report):

BASIC INFO: age (number), gender (0=female,1=male), height (cm), weight (kg)
BLOOD PRESSURE: systolic_bp (mmHg), diastolic_bp (mmHg)
CHOLESTEROL: cholesterol_level (1=normal,2=above normal,3=well above normal)
GLUCOSE: glucose_level (1=normal,2=above normal,3=well above normal)
LIFESTYLE: smoking_status (0=non,1=former,2=current), alcohol_consumption (0=none,1=occasional,2=moderate,3=heavy), physical_activity_level (0=sedentary,1=light,2=moderate,3=active)
MEDICAL HISTORY: stroke (0/1), heart_disease (0/1), diff_walk (0/1), family_history_kidney (0/1)
WELLNESS: mental_health (0-30 days poor), physical_health (0-30 days poor), energy_level (1-10), stress_level (0=low,1=moderate,2=high), immune_health (0=strong,1=average,2=weak)
RESPIRATORY: breathing_issue (0/1), finger_discoloration (0/1), exposure_to_pollution (0/1), long_term_illness (0/1), edema (0/1)
KIDNEY TESTS: serum_creatinine (mg/dL), bun_levels (mg/dL), gfr (mL/min/1.73m²), protein_in_urine (0/1), acr (mg/g)
LIVER TESTS: total_bilirubin (mg/dL), direct_bilirubin (mg/dL), alkaline_phosphotase (U/L), sgpt (U/L), sgot (U/L), total_proteins (g/dL), albumin (g/dL), ag_ratio
ELECTROLYTES/BLOOD: sodium (mEq/L), potassium (mEq/L), calcium (mg/dL), phosphorus (mg/dL), hemoglobin (g/dL)

Return ONLY valid JSON. Do not include markdown formatting or explanations.
`;

// ─── Report Upload Panel ──────────────────────────────────────────────────────
function ReportUploadPanel({ onFieldsExtracted }) {
    const [reports, setReports] = useState([]);
    const [extracting, setExtracting] = useState(false);
    const [extractResults, setExtractResults] = useState([]);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef();

    const addFiles = (files) => {
        const newReports = Array.from(files).map((file) => ({
            id: Date.now() + Math.random(),
            file,
            name: file.name,
            type: file.type,
            status: "pending", 
            extracted: null,
            error: null,
            preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
        }));
        setReports((prev) => [...prev, ...newReports]);
    };

    const removeReport = (id) => {
        setReports((prev) => {
            const r = prev.find((x) => x.id === id);
            if (r?.preview) URL.revokeObjectURL(r.preview);
            return prev.filter((x) => x.id !== id);
        });
        setExtractResults((prev) => prev.filter((x) => x.id !== id));
    };

    const fileToBase64 = (file) =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(",")[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

    const extractFromReport = async (report) => {
        setReports((prev) =>
            prev.map((r) => (r.id === report.id ? { ...r, status: "processing" } : r))
        );

        try {
            const base64 = await fileToBase64(report.file);
            const isPdf = report.type === "application/pdf";
            const isImage = report.type.startsWith("image/");

            if (!isPdf && !isImage) {
                throw new Error("Unsupported file type. Use PDF or image files.");
            }

            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            
            const result = await model.generateContent([
                FIELD_SCHEMA,
                {
                    inlineData: {
                        data: base64,
                        mimeType: report.type
                    }
                }
            ]);

            const response = await result.response;
            const text = response.text();
            
            // Clean response to ensure it's just JSON
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("Could not parse response from AI.");

            const extracted = JSON.parse(jsonMatch[0]);
            const fieldCount = Object.keys(extracted).length;

            setReports((prev) =>
                prev.map((r) =>
                    r.id === report.id ? { ...r, status: "done", extracted, fieldCount } : r
                )
            );
            return { id: report.id, extracted };
        } catch (err) {
            console.error("Gemini Error:", err);
            setReports((prev) =>
                prev.map((r) =>
                    r.id === report.id ? { ...r, status: "error", error: err.message } : r
                )
            );
            return { id: report.id, extracted: {} };
        }
    };

    const handleExtractAll = async () => {
        const pending = reports.filter((r) => r.status === "pending" || r.status === "error");
        if (!pending.length) return;

        setExtracting(true);
        const results = [];

        for (const report of pending) {
            const result = await extractFromReport(report);
            results.push(result);
        }

        setExtractResults((prev) => {
            const merged = [...prev];
            results.forEach((r) => {
                const idx = merged.findIndex((x) => x.id === r.id);
                if (idx >= 0) merged[idx] = r;
                else merged.push(r);
            });
            return merged;
        });

        const allExtracted = {};
        [...extractResults, ...results].forEach(({ extracted }) => {
            Object.assign(allExtracted, extracted);
        });
        onFieldsExtracted(allExtracted);
        setExtracting(false);
    };

    const handleApplyAll = () => {
        const allExtracted = {};
        reports
            .filter((r) => r.extracted)
            .forEach(({ extracted }) => Object.assign(allExtracted, extracted));
        onFieldsExtracted(allExtracted);
    };

    const totalExtracted = reports.reduce((acc, r) => acc + (r.fieldCount || 0), 0);
    const allDone = reports.length > 0 && reports.every((r) => r.status === "done" || r.status === "error");

    return (
        <div className="rup-panel">
            <div className="rup-header">
                <div className="rup-header-left">
                    <span className="rup-icon">📋</span>
                    <div>
                        <div className="rup-title">Auto-fill from Reports</div>
                        <div className="rup-subtitle">Upload lab reports, blood work, or health documents — Gemini extracts values automatically</div>
                    </div>
                </div>
                {reports.length > 0 && totalExtracted > 0 && (
                    <div className="rup-badge-count">{totalExtracted} fields found</div>
                )}
            </div>

            <div
                className={`rup-dropzone ${dragOver ? "drag-over" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,image/*"
                    multiple
                    style={{ display: "none" }}
                    onChange={(e) => addFiles(e.target.files)}
                />
                <div className="rup-dz-icon">⬆</div>
                <div className="rup-dz-text">
                    {dragOver ? "Drop files here" : "Click or drag to upload reports"}
                </div>
                <div className="rup-dz-hint">PDF, JPG, PNG — add multiple reports</div>
            </div>

            {reports.length > 0 && (
                <div className="rup-list">
                    {reports.map((r) => (
                        <div key={r.id} className={`rup-item rup-item--${r.status}`}>
                            <div className="rup-item-icon">
                                {r.type === "application/pdf" ? "📄" : "🖼"}
                            </div>
                            <div className="rup-item-info">
                                <div className="rup-item-name">{r.name}</div>
                                <div className="rup-item-meta">
                                    {r.status === "pending" && <span className="rup-status pending">Waiting</span>}
                                    {r.status === "processing" && (
                                        <span className="rup-status processing">
                                            <span className="rup-spin" /> Extracting...
                                        </span>
                                    )}
                                    {r.status === "done" && (
                                        <span className="rup-status done">✓ {r.fieldCount} fields extracted</span>
                                    )}
                                    {r.status === "error" && (
                                        <span className="rup-status error" title={r.error}>⚠ Failed — click Extract to retry</span>
                                    )}
                                </div>
                            </div>
                            {r.preview && (
                                <img src={r.preview} alt="preview" className="rup-thumb" />
                            )}
                            <button className="rup-remove" onClick={() => removeReport(r.id)} title="Remove">✕</button>
                        </div>
                    ))}
                </div>
            )}

            {reports.length > 0 && (
                <div className="rup-actions">
                    {!allDone && (
                        <button
                            className="rup-btn rup-btn--primary"
                            onClick={handleExtractAll}
                            disabled={extracting}
                        >
                            {extracting ? (
                                <><span className="rup-spin" /> Extracting...</>
                            ) : (
                                <> Extract All Fields</>
                            )}
                        </button>
                    )}
                    {allDone && totalExtracted > 0 && (
                        <button className="rup-btn rup-btn--apply" onClick={handleApplyAll}>
                            ✓ Apply {totalExtracted} Fields to Form
                        </button>
                    )}
                    <button
                        className="rup-btn rup-btn--ghost"
                        onClick={() => setReports([])}
                        disabled={extracting}
                    >
                        Clear All
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── Main Form ────────────────────────────────────────────────────────────────
export default function HealthForm({ onResult }) {
    const [formData, setFormData] = useState({
        age: 50, gender: 1, height: 170, weight: 70, bmi: 24.2,
        systolic_bp: 120, diastolic_bp: 80, cholesterol_level: 1, glucose_level: 1,
        smoking_status: 0, alcohol_consumption: 0, physical_activity_level: 1, gen_health: 3,
        stroke: 0, heart_disease: 0, chol_check: 1, diff_walk: 0,
        family_history_kidney: 0, smoking_family_history: 0,
        mental_health: 0, physical_health: 0, energy_level: 7, stress_level: 0, immune_health: 0,
        breathing_issue: 0, finger_discoloration: 0, exposure_to_pollution: 0, long_term_illness: 0, edema: 0,
        serum_creatinine: 1.0, bun_levels: 15, gfr: 90, protein_in_urine: 0, acr: 15,
        total_bilirubin: 0.8, direct_bilirubin: 0.3, alkaline_phosphotase: 200, sgpt: 25, sgot: 30,
        total_proteins: 7.0, albumin: 4.0, ag_ratio: 1.2,
        sodium: 140, potassium: 4.0, calcium: 9.5, phosphorus: 3.5, hemoglobin: 14.0,
    });

    const [autoFilled, setAutoFilled] = useState({}); 
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [bpStatus, setBpStatus] = useState({ text: "Normal", className: "bp-normal" });
    const [fillNotice, setFillNotice] = useState(null);

    useEffect(() => {
        const { height, weight } = formData;
        if (height && weight) {
            const hm = height / 100;
            const bmi = +(weight / (hm * hm)).toFixed(1);
            if (bmi !== formData.bmi) setFormData((p) => ({ ...p, bmi }));
        }
    }, [formData.height, formData.weight]);

    useEffect(() => {
        const { systolic_bp, diastolic_bp } = formData;
        if (systolic_bp >= 140 || diastolic_bp >= 95) setBpStatus({ text: "High BP", className: "bp-high" });
        else if (systolic_bp >= 125 || diastolic_bp >= 85) setBpStatus({ text: "Elevated", className: "bp-elevated" });
        else setBpStatus({ text: "Normal", className: "bp-normal" });
    }, [formData.systolic_bp, formData.diastolic_bp]);

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setFormData((p) => ({
            ...p,
            [name]: type === "number" ? parseFloat(value) || 0 : parseInt(value, 10),
        }));
        setAutoFilled((p) => { const n = { ...p }; delete n[name]; return n; });
    };

    const handleFieldsExtracted = (extracted) => {
        const count = Object.keys(extracted).length;
        if (count === 0) { setFillNotice({ type: "warn", msg: "No recognizable fields found in the uploaded reports." }); return; }

        setFormData((p) => ({ ...p, ...extracted }));
        setAutoFilled(extracted);
        setFillNotice({ type: "ok", msg: `${count} fields were auto-filled from your reports.`, count });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const high_bp = (formData.systolic_bp >= 140 || formData.diastolic_bp >= 90) ? 1 : 0;
        const high_chol = formData.cholesterol_level >= 2 ? 1 : 0;
        const smoker = formData.smoking_status >= 2 ? 1 : 0;
        const heavy_alcohol = formData.alcohol_consumption >= 3 ? 1 : 0;
        const alcohol = formData.alcohol_consumption >= 1 ? 1 : 0;
        const physical_activity = formData.physical_activity_level >= 2 ? 1 : 0;
        const active = formData.physical_activity_level >= 2 ? 1 : 0;
        const mental_stress = formData.stress_level >= 2 ? 1 : 0;
        const immune_weakness = formData.immune_health >= 2 ? 1 : 0;

        const payload = {
            ...formData,
            cholesterol: formData.cholesterol_level,
            glucose: formData.glucose_level,
            high_bp, high_chol, smoker, alcohol, heavy_alcohol,
            physical_activity, active, mental_stress, immune_weakness,
        };

        try {
            const response = await fetch("/api/predict", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await response.json();
            onResult(data);
        } catch (err) {
            setError("Failed to connect to prediction server. Make sure Flask is running on port 5000.");
        } finally {
            setLoading(false);
        }
    };

    const F = ({ name, label, children, helper }) => (
        <div className={`hf-field ${autoFilled[name] !== undefined ? "hf-field--autofilled" : ""}`}>
            <label>{label}</label>
            {children}
            {helper && <span className="hf-helper">{helper}</span>}
            {autoFilled[name] !== undefined && (
                <span className="hf-autofill-tag">AI extracted</span>
            )}
        </div>
    );

    return (
        <div className="hf-root">
            <div className="hf-scroll">
                <div className="hf-header">
                    <h1 className="hf-title">Multi-Organ Disease Risk Predictor</h1>
                    <p className="hf-subtitle">Comprehensive health assessment across 5 major organs</p>
                </div>

                <ReportUploadPanel onFieldsExtracted={handleFieldsExtracted} />

                {fillNotice && (
                    <div className={`hf-fill-notice hf-fill-notice--${fillNotice.type}`}>
                        <div className="hf-notice-content">
                            <span className="hf-notice-icon">{fillNotice.type === "ok" ? "✅" : "⚠️"}</span>
                            <span>{fillNotice.msg} {fillNotice.type === "ok" && <span style={{opacity: 0.7}}>Highlighted fields were updated — please verify.</span>}</span>
                        </div>
                        <button className="hf-notice-dismiss" onClick={() => setFillNotice(null)}>Dismiss</button>
                    </div>
                )}

                <div className="hf-divider">
                    <span>or fill manually</span>
                </div>

                <form onSubmit={handleSubmit} className="hf-form">
                    <section className="hf-section">
                        <h2 className="hf-section-title"><span className="hf-section-icon">👤</span> Basic Information</h2>
                        <div className="hf-grid">
                            <F name="age" label="Age (years)">
                                <input type="number" name="age" min="1" max="120" value={formData.age} onChange={handleChange} />
                            </F>
                            <F name="gender" label="Gender">
                                <select name="gender" value={formData.gender} onChange={handleChange}>
                                    <option value={1}>Male</option>
                                    <option value={0}>Female</option>
                                </select>
                            </F>
                            <F name="height" label="Height (cm)">
                                <input type="number" name="height" min="100" max="250" value={formData.height} onChange={handleChange} />
                            </F>
                            <F name="weight" label="Weight (kg)">
                                <input type="number" name="weight" min="30" max="200" value={formData.weight} onChange={handleChange} />
                            </F>
                            <F name="bmi" label="BMI" helper="Auto-calculated">
                                <input type="number" name="bmi" step="0.1" value={formData.bmi} readOnly className="hf-readonly" />
                            </F>
                        </div>
                    </section>

                    <section className="hf-section">
                        <h2 className="hf-section-title"><span className="hf-section-icon">❤️</span> Blood Pressure & Heart Health</h2>
                        <div className="hf-grid">
                            <F name="systolic_bp" label="Systolic BP (mmHg)">
                                <input type="number" name="systolic_bp" min="80" max="200" value={formData.systolic_bp} onChange={handleChange} />
                                <span className={`hf-badge ${bpStatus.className}`}>{bpStatus.text}</span>
                            </F>
                            <F name="diastolic_bp" label="Diastolic BP (mmHg)">
                                <input type="number" name="diastolic_bp" min="50" max="130" value={formData.diastolic_bp} onChange={handleChange} />
                            </F>
                            <F name="cholesterol_level" label="Cholesterol Level" helper="Based on lab tests">
                                <select name="cholesterol_level" value={formData.cholesterol_level} onChange={handleChange}>
                                    <option value={1}>Normal</option>
                                    <option value={2}>Above Normal</option>
                                    <option value={3}>Well Above Normal</option>
                                </select>
                            </F>
                            <F name="glucose_level" label="Blood Glucose Level">
                                <select name="glucose_level" value={formData.glucose_level} onChange={handleChange}>
                                    <option value={1}>Normal</option>
                                    <option value={2}>Above Normal</option>
                                    <option value={3}>Well Above Normal</option>
                                </select>
                            </F>
                        </div>
                    </section>

                    <section className="hf-section">
                        <h2 className="hf-section-title"><span className="hf-section-icon">🚬</span> Lifestyle Habits</h2>
                        <div className="hf-grid">
                            <F name="smoking_status" label="Smoking Status">
                                <select name="smoking_status" value={formData.smoking_status} onChange={handleChange}>
                                    <option value={0}>Non-smoker</option>
                                    <option value={1}>Former smoker</option>
                                    <option value={2}>Current smoker</option>
                                </select>
                            </F>
                            <F name="alcohol_consumption" label="Alcohol Consumption">
                                <select name="alcohol_consumption" value={formData.alcohol_consumption} onChange={handleChange}>
                                    <option value={0}>None</option>
                                    <option value={1}>Occasional (1-2/week)</option>
                                    <option value={2}>Moderate (3-7/week)</option>
                                    <option value={3}>Heavy (8+/week)</option>
                                </select>
                            </F>
                            <F name="physical_activity_level" label="Physical Activity Level">
                                <select name="physical_activity_level" value={formData.physical_activity_level} onChange={handleChange}>
                                    <option value={0}>Sedentary</option>
                                    <option value={1}>Light (1-2 days/week)</option>
                                    <option value={2}>Moderate (3-4 days/week)</option>
                                    <option value={3}>Active (5+ days/week)</option>
                                </select>
                            </F>
                            <F name="gen_health" label="General Health Rating">
                                <select name="gen_health" value={formData.gen_health} onChange={handleChange}>
                                    <option value={1}>Excellent</option>
                                    <option value={2}>Very Good</option>
                                    <option value={3}>Good</option>
                                    <option value={4}>Fair</option>
                                    <option value={5}>Poor</option>
                                </select>
                            </F>
                        </div>
                    </section>

                    <section className="hf-section">
                        <h2 className="hf-section-title"><span className="hf-section-icon">🩺</span> Medical History</h2>
                        <div className="hf-grid">
                            <F name="stroke" label="History of Stroke?">
                                <select name="stroke" value={formData.stroke} onChange={handleChange}>
                                    <option value={0}>No</option><option value={1}>Yes</option>
                                </select>
                            </F>
                            <F name="heart_disease" label="Heart Disease or Attack?">
                                <select name="heart_disease" value={formData.heart_disease} onChange={handleChange}>
                                    <option value={0}>No</option><option value={1}>Yes</option>
                                </select>
                            </F>
                            <F name="chol_check" label="Cholesterol Check (Last 5 yrs)?">
                                <select name="chol_check" value={formData.chol_check} onChange={handleChange}>
                                    <option value={1}>Yes</option><option value={0}>No</option>
                                </select>
                            </F>
                            <F name="diff_walk" label="Difficulty Walking?">
                                <select name="diff_walk" value={formData.diff_walk} onChange={handleChange}>
                                    <option value={0}>No</option><option value={1}>Yes</option>
                                </select>
                            </F>
                            <F name="family_history_kidney" label="Family History of Kidney Disease?">
                                <select name="family_history_kidney" value={formData.family_history_kidney} onChange={handleChange}>
                                    <option value={0}>No</option><option value={1}>Yes</option>
                                </select>
                            </F>
                            <F name="smoking_family_history" label="Family History of Smoking?">
                                <select name="smoking_family_history" value={formData.smoking_family_history} onChange={handleChange}>
                                    <option value={0}>No</option><option value={1}>Yes</option>
                                </select>
                            </F>
                        </div>
                    </section>

                    <section className="hf-section">
                        <h2 className="hf-section-title"><span className="hf-section-icon">🧠</span> Mental & Physical Wellness</h2>
                        <div className="hf-grid">
                            <F name="mental_health" label="Days of Poor Mental Health (past 30)">
                                <input type="number" name="mental_health" min="0" max="30" value={formData.mental_health} onChange={handleChange} />
                            </F>
                            <F name="physical_health" label="Days of Poor Physical Health (past 30)">
                                <input type="number" name="physical_health" min="0" max="30" value={formData.physical_health} onChange={handleChange} />
                            </F>
                            <F name="energy_level" label="Energy Level (1-10)" helper="1=Very Low, 10=Very High">
                                <input type="number" name="energy_level" min="1" max="10" value={formData.energy_level} onChange={handleChange} />
                            </F>
                            <F name="stress_level" label="Stress Level">
                                <select name="stress_level" value={formData.stress_level} onChange={handleChange}>
                                    <option value={0}>Low</option>
                                    <option value={1}>Moderate</option>
                                    <option value={2}>High</option>
                                </select>
                            </F>
                            <F name="immune_health" label="Immune System Health">
                                <select name="immune_health" value={formData.immune_health} onChange={handleChange}>
                                    <option value={0}>Strong</option>
                                    <option value={1}>Average</option>
                                    <option value={2}>Weak</option>
                                </select>
                            </F>
                        </div>
                    </section>

                    <section className="hf-section">
                        <h2 className="hf-section-title"><span className="hf-section-icon">🫁</span> Respiratory & Environmental Factors</h2>
                        <div className="hf-grid">
                            <F name="breathing_issue" label="Breathing Issues?">
                                <select name="breathing_issue" value={formData.breathing_issue} onChange={handleChange}>
                                    <option value={0}>No</option><option value={1}>Yes</option>
                                </select>
                            </F>
                            <F name="finger_discoloration" label="Finger Discoloration?">
                                <select name="finger_discoloration" value={formData.finger_discoloration} onChange={handleChange}>
                                    <option value={0}>No</option><option value={1}>Yes</option>
                                </select>
                            </F>
                            <F name="exposure_to_pollution" label="Regular Pollution Exposure?">
                                <select name="exposure_to_pollution" value={formData.exposure_to_pollution} onChange={handleChange}>
                                    <option value={0}>No</option><option value={1}>Yes</option>
                                </select>
                            </F>
                            <F name="long_term_illness" label="Chronic/Long-term Illness?">
                                <select name="long_term_illness" value={formData.long_term_illness} onChange={handleChange}>
                                    <option value={0}>No</option><option value={1}>Yes</option>
                                </select>
                            </F>
                            <F name="edema" label="Swelling/Edema?">
                                <select name="edema" value={formData.edema} onChange={handleChange}>
                                    <option value={0}>No</option><option value={1}>Yes</option>
                                </select>
                            </F>
                        </div>
                    </section>

                    <section className="hf-section">
                        <h2 className="hf-section-title"><span className="hf-section-icon">🔬</span> Kidney Function Tests</h2>
                        <div className="hf-grid">
                            <F name="serum_creatinine" label="Serum Creatinine (mg/dL)" helper="Normal: 0.6–1.2">
                                <input type="number" name="serum_creatinine" step="0.1" value={formData.serum_creatinine} onChange={handleChange} />
                            </F>
                            <F name="bun_levels" label="BUN Levels (mg/dL)" helper="Normal: 7–20">
                                <input type="number" name="bun_levels" step="0.1" value={formData.bun_levels} onChange={handleChange} />
                            </F>
                            <F name="gfr" label="GFR (mL/min/1.73m²)" helper="Normal: >90">
                                <input type="number" name="gfr" step="0.1" value={formData.gfr} onChange={handleChange} />
                            </F>
                            <F name="protein_in_urine" label="Protein in Urine?">
                                <select name="protein_in_urine" value={formData.protein_in_urine} onChange={handleChange}>
                                    <option value={0}>No</option><option value={1}>Yes</option>
                                </select>
                            </F>
                            <F name="acr" label="ACR (mg/g)" helper="Normal: <30">
                                <input type="number" name="acr" step="0.1" value={formData.acr} onChange={handleChange} />
                            </F>
                        </div>
                    </section>

                    <section className="hf-section">
                        <h2 className="hf-section-title"><span className="hf-section-icon">🧪</span> Liver Function Tests</h2>
                        <div className="hf-grid">
                            <F name="total_bilirubin" label="Total Bilirubin (mg/dL)" helper="Normal: 0.1–1.2">
                                <input type="number" name="total_bilirubin" step="0.1" value={formData.total_bilirubin} onChange={handleChange} />
                            </F>
                            <F name="direct_bilirubin" label="Direct Bilirubin (mg/dL)" helper="Normal: 0–0.3">
                                <input type="number" name="direct_bilirubin" step="0.1" value={formData.direct_bilirubin} onChange={handleChange} />
                            </F>
                            <F name="alkaline_phosphotase" label="Alkaline Phosphatase (U/L)" helper="Normal: 44–147">
                                <input type="number" name="alkaline_phosphotase" value={formData.alkaline_phosphotase} onChange={handleChange} />
                            </F>
                            <F name="sgpt" label="SGPT/ALT (U/L)" helper="Normal: 7–56">
                                <input type="number" name="sgpt" value={formData.sgpt} onChange={handleChange} />
                            </F>
                            <F name="sgot" label="SGOT/AST (U/L)" helper="Normal: 10–40">
                                <input type="number" name="sgot" value={formData.sgot} onChange={handleChange} />
                            </F>
                            <F name="total_proteins" label="Total Proteins (g/dL)" helper="Normal: 6.0–8.3">
                                <input type="number" name="total_proteins" step="0.1" value={formData.total_proteins} onChange={handleChange} />
                            </F>
                            <F name="albumin" label="Albumin (g/dL)" helper="Normal: 3.5–5.5">
                                <input type="number" name="albumin" step="0.1" value={formData.albumin} onChange={handleChange} />
                            </F>
                            <F name="ag_ratio" label="A/G Ratio" helper="Normal: 1.0–2.5">
                                <input type="number" name="ag_ratio" step="0.1" value={formData.ag_ratio} onChange={handleChange} />
                            </F>
                        </div>
                    </section>

                    <section className="hf-section">
                        <h2 className="hf-section-title"><span className="hf-section-icon">⚡</span> Electrolytes & Blood Tests</h2>
                        <div className="hf-grid">
                            <F name="sodium" label="Sodium (mEq/L)" helper="Normal: 136–145">
                                <input type="number" name="sodium" step="0.1" value={formData.sodium} onChange={handleChange} />
                            </F>
                            <F name="potassium" label="Potassium (mEq/L)" helper="Normal: 3.5–5.0">
                                <input type="number" name="potassium" step="0.1" value={formData.potassium} onChange={handleChange} />
                            </F>
                            <F name="calcium" label="Calcium (mg/dL)" helper="Normal: 8.5–10.2">
                                <input type="number" name="calcium" step="0.1" value={formData.calcium} onChange={handleChange} />
                            </F>
                            <F name="phosphorus" label="Phosphorus (mg/dL)" helper="Normal: 2.5–4.5">
                                <input type="number" name="phosphorus" step="0.1" value={formData.phosphorus} onChange={handleChange} />
                            </F>
                            <F name="hemoglobin" label="Hemoglobin (g/dL)" helper="Normal: 12–17">
                                <input type="number" name="hemoglobin" step="0.1" value={formData.hemoglobin} onChange={handleChange} />
                            </F>
                        </div>
                    </section>

                    <button type="submit" className="hf-submit" disabled={loading}>
                        {loading ? (
                            <span className="hf-loading"><span className="hf-spinner" /> Analyzing your health data...</span>
                        ) : (
                            "Analyze Health Risk"
                        )}
                    </button>

                    {error && <p className="hf-error">{error}</p>}
                </form>
            </div>
        </div>
    );
}