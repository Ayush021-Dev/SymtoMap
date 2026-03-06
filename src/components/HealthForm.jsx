import { useState } from "react";

export default function HealthForm({ onResult }) {

  const [formData, setFormData] = useState({
    age: 50,
    gender: 1,
    height: 170,
    weight: 70,
    bmi: 24,

    systolic_bp: 120,
    diastolic_bp: 80,

    cholesterol: 1,
    glucose: 1,

    high_bp: 0,
    high_chol: 0,

    smoker: 0,
    alcohol: 0,
    heavy_alcohol: 0,

    physical_activity: 1,
    active: 1,

    stroke: 0,
    heart_disease: 0,
    chol_check: 1,
    diff_walk: 0,
    family_history_kidney: 0,
    smoking_family_history: 0,

    gen_health: 3,
    mental_health: 0,
    physical_health: 0,
    energy_level: 5,

    mental_stress: 0,
    immune_weakness: 0,

    breathing_issue: 0,
    finger_discoloration: 0,
    exposure_to_pollution: 0,
    long_term_illness: 0,
    edema: 0,

    serum_creatinine: 1,
    bun_levels: 15,
    gfr: 90,
    protein_in_urine: 0,
    acr: 15,

    total_bilirubin: 0.8,
    direct_bilirubin: 0.3,
    alkaline_phosphotase: 200,
    sgpt: 25,
    sgot: 30,
    total_proteins: 7,
    albumin: 4,
    ag_ratio: 1.2,

    sodium: 140,
    potassium: 4,
    calcium: 9.5,
    phosphorus: 3.5,
    hemoglobin: 14
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: parseFloat(e.target.value)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("http://localhost:5000/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      console.log("Prediction result:", data);

      // Pass result up to App so it can switch to HumanBody view
      onResult(data);
    } catch (err) {
      console.error("Prediction error:", err);
      setError("Failed to connect to prediction server. Make sure Flask is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ overflowY: "auto", width: "100%", padding: "20px" }}>
      <h2>Health Form</h2>

      <form onSubmit={handleSubmit}>
        {Object.keys(formData).map((key) => (
          <div key={key}>
            <label>{key}</label>
            <input
              name={key}
              type="number"
              value={formData[key]}
              onChange={handleChange}
            />
          </div>
        ))}

        <button type="submit" disabled={loading}>
          {loading ? "Analyzing..." : "Predict"}
        </button>
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}