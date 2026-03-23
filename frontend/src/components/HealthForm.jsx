import { useState, useEffect } from "react";
import "./HealthForm.css";

export default function HealthForm({ onResult }) {
    const [formData, setFormData] = useState({
        // Basic Info
        age: 50,
        gender: 1,
        height: 170,
        weight: 70,
        bmi: 24.2,

        // BP & Cardio
        systolic_bp: 120,
        diastolic_bp: 80,
        cholesterol_level: 1,
        glucose_level: 1,

        // Lifestyle
        smoking_status: 0,
        alcohol_consumption: 0,
        physical_activity_level: 1,
        gen_health: 3,

        // Medical History
        stroke: 0,
        heart_disease: 0,
        chol_check: 1,
        diff_walk: 0,
        family_history_kidney: 0,
        smoking_family_history: 0,

        // Mental & Physical Wellness
        mental_health: 0,
        physical_health: 0,
        energy_level: 7,
        stress_level: 0,
        immune_health: 0,

        // Respiratory
        breathing_issue: 0,
        finger_discoloration: 0,
        exposure_to_pollution: 0,
        long_term_illness: 0,
        edema: 0,

        // Kidney Function Tests
        serum_creatinine: 1.0,
        bun_levels: 15,
        gfr: 90,
        protein_in_urine: 0,
        acr: 15,

        // Liver Function Tests
        total_bilirubin: 0.8,
        direct_bilirubin: 0.3,
        alkaline_phosphotase: 200,
        sgpt: 25,
        sgot: 30,
        total_proteins: 7.0,
        albumin: 4.0,
        ag_ratio: 1.2,

        // Electrolytes & Blood
        sodium: 140,
        potassium: 4.0,
        calcium: 9.5,
        phosphorus: 3.5,
        hemoglobin: 14.0,
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [bpStatus, setBpStatus] = useState({ text: "Normal", className: "bp-normal" });

    // Auto-calculate BMI
    useEffect(() => {
        const h = formData.height;
        const w = formData.weight;
        if (h && w) {
            const hm = h / 100;
            const bmi = +(w / (hm * hm)).toFixed(1);
            if (bmi !== formData.bmi) {
                setFormData((prev) => ({ ...prev, bmi }));
            }
        }
    }, [formData.height, formData.weight]);

    // Update BP status
    useEffect(() => {
        const { systolic_bp, diastolic_bp } = formData;
        if (systolic_bp >= 140 || diastolic_bp >= 95) {
            setBpStatus({ text: "High BP", className: "bp-high" });
        } else if (systolic_bp >= 125 || diastolic_bp >= 85) {
            setBpStatus({ text: "Elevated", className: "bp-elevated" });
        } else {
            setBpStatus({ text: "Normal", className: "bp-normal" });
        }
    }, [formData.systolic_bp, formData.diastolic_bp]);

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === "number" ? parseFloat(value) || 0 : parseInt(value, 10),
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Derive binary flags from selections
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
            age: formData.age,
            gender: formData.gender,
            height: formData.height,
            weight: formData.weight,
            bmi: formData.bmi,
            systolic_bp: formData.systolic_bp,
            diastolic_bp: formData.diastolic_bp,
            cholesterol: formData.cholesterol_level,
            glucose: formData.glucose_level,

            high_bp,
            high_chol,
            smoker,
            alcohol,
            heavy_alcohol,
            physical_activity,
            active,
            mental_stress,
            immune_weakness,

            stroke: formData.stroke,
            heart_disease: formData.heart_disease,
            chol_check: formData.chol_check,
            diff_walk: formData.diff_walk,
            family_history_kidney: formData.family_history_kidney,
            smoking_family_history: formData.smoking_family_history,

            gen_health: formData.gen_health,
            mental_health: formData.mental_health,
            physical_health: formData.physical_health,
            energy_level: formData.energy_level,

            breathing_issue: formData.breathing_issue,
            finger_discoloration: formData.finger_discoloration,
            exposure_to_pollution: formData.exposure_to_pollution,
            long_term_illness: formData.long_term_illness,
            edema: formData.edema,

            serum_creatinine: formData.serum_creatinine,
            bun_levels: formData.bun_levels,
            gfr: formData.gfr,
            protein_in_urine: formData.protein_in_urine,
            acr: formData.acr,

            total_bilirubin: formData.total_bilirubin,
            direct_bilirubin: formData.direct_bilirubin,
            alkaline_phosphotase: formData.alkaline_phosphotase,
            sgpt: formData.sgpt,
            sgot: formData.sgot,
            total_proteins: formData.total_proteins,
            albumin: formData.albumin,
            ag_ratio: formData.ag_ratio,

            sodium: formData.sodium,
            potassium: formData.potassium,
            calcium: formData.calcium,
            phosphorus: formData.phosphorus,
            hemoglobin: formData.hemoglobin,
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
            console.error("Prediction error:", err);
            setError("Failed to connect to prediction server. Make sure Flask is running on port 5000.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="hf-root">
            <div className="hf-scroll">
                <div className="hf-header">
                    <h1 className="hf-title">Multi-Organ Disease Risk Predictor</h1>
                    <p className="hf-subtitle">Comprehensive health assessment across 5 major organs</p>
                </div>

                <form onSubmit={handleSubmit} className="hf-form">

                    {/* ── Basic Information ──────────────────── */}
                    <section className="hf-section">
                        <h2 className="hf-section-title">
                            <span className="hf-section-icon">👤</span> Basic Information
                        </h2>
                        <div className="hf-grid">
                            <div className="hf-field">
                                <label>Age (years)</label>
                                <input type="number" name="age" min="1" max="120" value={formData.age} onChange={handleChange} />
                            </div>
                            <div className="hf-field">
                                <label>Gender</label>
                                <select name="gender" value={formData.gender} onChange={handleChange}>
                                    <option value={1}>Male</option>
                                    <option value={0}>Female</option>
                                </select>
                            </div>
                            <div className="hf-field">
                                <label>Height (cm)</label>
                                <input type="number" name="height" min="100" max="250" value={formData.height} onChange={handleChange} />
                            </div>
                            <div className="hf-field">
                                <label>Weight (kg)</label>
                                <input type="number" name="weight" min="30" max="200" value={formData.weight} onChange={handleChange} />
                            </div>
                            <div className="hf-field">
                                <label>BMI</label>
                                <input type="number" name="bmi" step="0.1" value={formData.bmi} readOnly className="hf-readonly" />
                                <span className="hf-helper">Auto-calculated</span>
                            </div>
                        </div>
                    </section>

                    {/* ── Blood Pressure & Heart ─────────────── */}
                    <section className="hf-section">
                        <h2 className="hf-section-title">
                            <span className="hf-section-icon">❤️</span> Blood Pressure & Heart Health
                        </h2>
                        <div className="hf-grid">
                            <div className="hf-field">
                                <label>Systolic BP (mmHg)</label>
                                <input type="number" name="systolic_bp" min="80" max="200" value={formData.systolic_bp} onChange={handleChange} />
                                <span className={`hf-badge ${bpStatus.className}`}>{bpStatus.text}</span>
                            </div>
                            <div className="hf-field">
                                <label>Diastolic BP (mmHg)</label>
                                <input type="number" name="diastolic_bp" min="50" max="130" value={formData.diastolic_bp} onChange={handleChange} />
                            </div>
                            <div className="hf-field">
                                <label>Cholesterol Level</label>
                                <select name="cholesterol_level" value={formData.cholesterol_level} onChange={handleChange}>
                                    <option value={1}>Normal</option>
                                    <option value={2}>Above Normal</option>
                                    <option value={3}>Well Above Normal</option>
                                </select>
                                <span className="hf-helper">Based on lab tests</span>
                            </div>
                            <div className="hf-field">
                                <label>Blood Glucose Level</label>
                                <select name="glucose_level" value={formData.glucose_level} onChange={handleChange}>
                                    <option value={1}>Normal</option>
                                    <option value={2}>Above Normal</option>
                                    <option value={3}>Well Above Normal</option>
                                </select>
                            </div>
                        </div>
                    </section>

                    {/* ── Lifestyle Habits ───────────────────── */}
                    <section className="hf-section">
                        <h2 className="hf-section-title">
                            <span className="hf-section-icon">🚬</span> Lifestyle Habits
                        </h2>
                        <div className="hf-grid">
                            <div className="hf-field">
                                <label>Smoking Status</label>
                                <select name="smoking_status" value={formData.smoking_status} onChange={handleChange}>
                                    <option value={0}>Non-smoker</option>
                                    <option value={1}>Former smoker</option>
                                    <option value={2}>Current smoker</option>
                                </select>
                            </div>
                            <div className="hf-field">
                                <label>Alcohol Consumption</label>
                                <select name="alcohol_consumption" value={formData.alcohol_consumption} onChange={handleChange}>
                                    <option value={0}>None</option>
                                    <option value={1}>Occasional (1-2/week)</option>
                                    <option value={2}>Moderate (3-7/week)</option>
                                    <option value={3}>Heavy (8+/week)</option>
                                </select>
                            </div>
                            <div className="hf-field">
                                <label>Physical Activity Level</label>
                                <select name="physical_activity_level" value={formData.physical_activity_level} onChange={handleChange}>
                                    <option value={0}>Sedentary</option>
                                    <option value={1}>Light (1-2 days/week)</option>
                                    <option value={2}>Moderate (3-4 days/week)</option>
                                    <option value={3}>Active (5+ days/week)</option>
                                </select>
                            </div>
                            <div className="hf-field">
                                <label>General Health Rating</label>
                                <select name="gen_health" value={formData.gen_health} onChange={handleChange}>
                                    <option value={1}>Excellent</option>
                                    <option value={2}>Very Good</option>
                                    <option value={3}>Good</option>
                                    <option value={4}>Fair</option>
                                    <option value={5}>Poor</option>
                                </select>
                            </div>
                        </div>
                    </section>

                    {/* ── Medical History ─────────────────────── */}
                    <section className="hf-section">
                        <h2 className="hf-section-title">
                            <span className="hf-section-icon">🩺</span> Medical History
                        </h2>
                        <div className="hf-grid">
                            <div className="hf-field">
                                <label>History of Stroke?</label>
                                <select name="stroke" value={formData.stroke} onChange={handleChange}>
                                    <option value={0}>No</option><option value={1}>Yes</option>
                                </select>
                            </div>
                            <div className="hf-field">
                                <label>Heart Disease or Attack?</label>
                                <select name="heart_disease" value={formData.heart_disease} onChange={handleChange}>
                                    <option value={0}>No</option><option value={1}>Yes</option>
                                </select>
                            </div>
                            <div className="hf-field">
                                <label>Cholesterol Check (Last 5 yrs)?</label>
                                <select name="chol_check" value={formData.chol_check} onChange={handleChange}>
                                    <option value={1}>Yes</option><option value={0}>No</option>
                                </select>
                            </div>
                            <div className="hf-field">
                                <label>Difficulty Walking?</label>
                                <select name="diff_walk" value={formData.diff_walk} onChange={handleChange}>
                                    <option value={0}>No</option><option value={1}>Yes</option>
                                </select>
                            </div>
                            <div className="hf-field">
                                <label>Family History of Kidney Disease?</label>
                                <select name="family_history_kidney" value={formData.family_history_kidney} onChange={handleChange}>
                                    <option value={0}>No</option><option value={1}>Yes</option>
                                </select>
                            </div>
                            <div className="hf-field">
                                <label>Family History of Smoking?</label>
                                <select name="smoking_family_history" value={formData.smoking_family_history} onChange={handleChange}>
                                    <option value={0}>No</option><option value={1}>Yes</option>
                                </select>
                            </div>
                        </div>
                    </section>

                    {/* ── Mental & Physical Wellness ──────────── */}
                    <section className="hf-section">
                        <h2 className="hf-section-title">
                            <span className="hf-section-icon">🧠</span> Mental & Physical Wellness
                        </h2>
                        <div className="hf-grid">
                            <div className="hf-field">
                                <label>Days of Poor Mental Health (past 30)</label>
                                <input type="number" name="mental_health" min="0" max="30" value={formData.mental_health} onChange={handleChange} />
                            </div>
                            <div className="hf-field">
                                <label>Days of Poor Physical Health (past 30)</label>
                                <input type="number" name="physical_health" min="0" max="30" value={formData.physical_health} onChange={handleChange} />
                            </div>
                            <div className="hf-field">
                                <label>Energy Level (1-10)</label>
                                <input type="number" name="energy_level" min="1" max="10" value={formData.energy_level} onChange={handleChange} />
                                <span className="hf-helper">1=Very Low, 10=Very High</span>
                            </div>
                            <div className="hf-field">
                                <label>Stress Level</label>
                                <select name="stress_level" value={formData.stress_level} onChange={handleChange}>
                                    <option value={0}>Low</option>
                                    <option value={1}>Moderate</option>
                                    <option value={2}>High</option>
                                </select>
                            </div>
                            <div className="hf-field">
                                <label>Immune System Health</label>
                                <select name="immune_health" value={formData.immune_health} onChange={handleChange}>
                                    <option value={0}>Strong</option>
                                    <option value={1}>Average</option>
                                    <option value={2}>Weak</option>
                                </select>
                            </div>
                        </div>
                    </section>

                    {/* ── Respiratory & Environmental ─────────── */}
                    <section className="hf-section">
                        <h2 className="hf-section-title">
                            <span className="hf-section-icon">🫁</span> Respiratory & Environmental Factors
                        </h2>
                        <div className="hf-grid">
                            <div className="hf-field">
                                <label>Breathing Issues?</label>
                                <select name="breathing_issue" value={formData.breathing_issue} onChange={handleChange}>
                                    <option value={0}>No</option><option value={1}>Yes</option>
                                </select>
                            </div>
                            <div className="hf-field">
                                <label>Finger Discoloration?</label>
                                <select name="finger_discoloration" value={formData.finger_discoloration} onChange={handleChange}>
                                    <option value={0}>No</option><option value={1}>Yes</option>
                                </select>
                            </div>
                            <div className="hf-field">
                                <label>Regular Pollution Exposure?</label>
                                <select name="exposure_to_pollution" value={formData.exposure_to_pollution} onChange={handleChange}>
                                    <option value={0}>No</option><option value={1}>Yes</option>
                                </select>
                            </div>
                            <div className="hf-field">
                                <label>Chronic/Long-term Illness?</label>
                                <select name="long_term_illness" value={formData.long_term_illness} onChange={handleChange}>
                                    <option value={0}>No</option><option value={1}>Yes</option>
                                </select>
                            </div>
                            <div className="hf-field">
                                <label>Swelling/Edema?</label>
                                <select name="edema" value={formData.edema} onChange={handleChange}>
                                    <option value={0}>No</option><option value={1}>Yes</option>
                                </select>
                            </div>
                        </div>
                    </section>

                    {/* ── Kidney Function Tests ──────────────── */}
                    <section className="hf-section">
                        <h2 className="hf-section-title">
                            <span className="hf-section-icon">🔬</span> Kidney Function Tests
                        </h2>
                        <div className="hf-grid">
                            <div className="hf-field">
                                <label>Serum Creatinine (mg/dL)</label>
                                <input type="number" name="serum_creatinine" step="0.1" value={formData.serum_creatinine} onChange={handleChange} />
                                <span className="hf-helper">Normal: 0.6-1.2</span>
                            </div>
                            <div className="hf-field">
                                <label>BUN Levels (mg/dL)</label>
                                <input type="number" name="bun_levels" step="0.1" value={formData.bun_levels} onChange={handleChange} />
                                <span className="hf-helper">Normal: 7-20</span>
                            </div>
                            <div className="hf-field">
                                <label>GFR (mL/min/1.73m²)</label>
                                <input type="number" name="gfr" step="0.1" value={formData.gfr} onChange={handleChange} />
                                <span className="hf-helper">Normal: &gt;90</span>
                            </div>
                            <div className="hf-field">
                                <label>Protein in Urine?</label>
                                <select name="protein_in_urine" value={formData.protein_in_urine} onChange={handleChange}>
                                    <option value={0}>No</option><option value={1}>Yes</option>
                                </select>
                            </div>
                            <div className="hf-field">
                                <label>ACR (mg/g)</label>
                                <input type="number" name="acr" step="0.1" value={formData.acr} onChange={handleChange} />
                                <span className="hf-helper">Normal: &lt;30</span>
                            </div>
                        </div>
                    </section>

                    {/* ── Liver Function Tests ───────────────── */}
                    <section className="hf-section">
                        <h2 className="hf-section-title">
                            <span className="hf-section-icon">🧪</span> Liver Function Tests
                        </h2>
                        <div className="hf-grid">
                            <div className="hf-field">
                                <label>Total Bilirubin (mg/dL)</label>
                                <input type="number" name="total_bilirubin" step="0.1" value={formData.total_bilirubin} onChange={handleChange} />
                                <span className="hf-helper">Normal: 0.1-1.2</span>
                            </div>
                            <div className="hf-field">
                                <label>Direct Bilirubin (mg/dL)</label>
                                <input type="number" name="direct_bilirubin" step="0.1" value={formData.direct_bilirubin} onChange={handleChange} />
                                <span className="hf-helper">Normal: 0-0.3</span>
                            </div>
                            <div className="hf-field">
                                <label>Alkaline Phosphatase (U/L)</label>
                                <input type="number" name="alkaline_phosphotase" value={formData.alkaline_phosphotase} onChange={handleChange} />
                                <span className="hf-helper">Normal: 44-147</span>
                            </div>
                            <div className="hf-field">
                                <label>SGPT/ALT (U/L)</label>
                                <input type="number" name="sgpt" value={formData.sgpt} onChange={handleChange} />
                                <span className="hf-helper">Normal: 7-56</span>
                            </div>
                            <div className="hf-field">
                                <label>SGOT/AST (U/L)</label>
                                <input type="number" name="sgot" value={formData.sgot} onChange={handleChange} />
                                <span className="hf-helper">Normal: 10-40</span>
                            </div>
                            <div className="hf-field">
                                <label>Total Proteins (g/dL)</label>
                                <input type="number" name="total_proteins" step="0.1" value={formData.total_proteins} onChange={handleChange} />
                                <span className="hf-helper">Normal: 6.0-8.3</span>
                            </div>
                            <div className="hf-field">
                                <label>Albumin (g/dL)</label>
                                <input type="number" name="albumin" step="0.1" value={formData.albumin} onChange={handleChange} />
                                <span className="hf-helper">Normal: 3.5-5.5</span>
                            </div>
                            <div className="hf-field">
                                <label>A/G Ratio</label>
                                <input type="number" name="ag_ratio" step="0.1" value={formData.ag_ratio} onChange={handleChange} />
                                <span className="hf-helper">Normal: 1.0-2.5</span>
                            </div>
                        </div>
                    </section>

                    {/* ── Electrolytes & Blood ───────────────── */}
                    <section className="hf-section">
                        <h2 className="hf-section-title">
                            <span className="hf-section-icon">⚡</span> Electrolytes & Blood Tests
                        </h2>
                        <div className="hf-grid">
                            <div className="hf-field">
                                <label>Sodium (mEq/L)</label>
                                <input type="number" name="sodium" step="0.1" value={formData.sodium} onChange={handleChange} />
                                <span className="hf-helper">Normal: 136-145</span>
                            </div>
                            <div className="hf-field">
                                <label>Potassium (mEq/L)</label>
                                <input type="number" name="potassium" step="0.1" value={formData.potassium} onChange={handleChange} />
                                <span className="hf-helper">Normal: 3.5-5.0</span>
                            </div>
                            <div className="hf-field">
                                <label>Calcium (mg/dL)</label>
                                <input type="number" name="calcium" step="0.1" value={formData.calcium} onChange={handleChange} />
                                <span className="hf-helper">Normal: 8.5-10.2</span>
                            </div>
                            <div className="hf-field">
                                <label>Phosphorus (mg/dL)</label>
                                <input type="number" name="phosphorus" step="0.1" value={formData.phosphorus} onChange={handleChange} />
                                <span className="hf-helper">Normal: 2.5-4.5</span>
                            </div>
                            <div className="hf-field">
                                <label>Hemoglobin (g/dL)</label>
                                <input type="number" name="hemoglobin" step="0.1" value={formData.hemoglobin} onChange={handleChange} />
                                <span className="hf-helper">Normal: 12-17</span>
                            </div>
                        </div>
                    </section>

                    {/* ── Submit ─────────────────────────────── */}
                    <button type="submit" className="hf-submit" disabled={loading}>
                        {loading ? (
                            <span className="hf-loading">
                                <span className="hf-spinner" />
                                Analyzing your health data...
                            </span>
                        ) : (
                            <>🔍 Analyze Health Risk</>
                        )}
                    </button>

                    {error && <p className="hf-error">{error}</p>}
                </form>
            </div>
        </div>
    );
}
