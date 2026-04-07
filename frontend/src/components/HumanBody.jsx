import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import * as THREE from "three";
import "./HumanBody.css";

// ─── Constants ────────────────────────────────────────────────────────────────

const COLLECTION_TO_ORGAN_KEY = {
    "Heart": "heart",
    "kidneys": "kidney",
    "Liver": "liver",
    "Lungs": "lung",
    "pancreas": "diabetes",
};

const ORGAN_MODEL_PATHS = {
    heart: "/models/heart.glb",
    lung: "/models/lungs.glb",
    liver: "/models/liver.glb",
    kidney: "/models/kidneys.glb",
    diabetes: "/models/pancreas.glb",
};

const ORGAN_ROTATION_FIX = {
    "/models/lungs.glb": new THREE.Euler(Math.PI / 2, Math.PI, 0),
};

const ORGAN_LABELS = {
    heart: "Heart",
    lung: "Lungs",
    liver: "Liver",
    kidney: "Kidneys",
    diabetes: "Pancreas",
};

const ORGAN_ANCHOR_NUDGE = {
    lung: { dx: 38, dy: -10 },
    heart: { dx: 0, dy: 0 },
    liver: { dx: 0, dy: 0 },
    kidney: { dx: -20, dy: 0 },
    diabetes: { dx: 0, dy: 0 },
};

const ORGAN_ISSUES = {
    heart: {
        High: ["Coronary Artery Disease", "Heart Failure", "Cardiac Arrest Risk"],
        Moderate: ["Hypertensive Heart Disease", "Arrhythmia", "Mild Cardiomegaly"],
        Low: ["Minor Valve Irregularity", "Borderline Cholesterol"],
    },
    lung: {
        High: ["Pulmonary Fibrosis", "COPD", "Lung Cancer Risk"],
        Moderate: ["Chronic Bronchitis", "Mild Emphysema", "Asthma"],
        Low: ["Seasonal Allergies", "Minor Airway Inflammation"],
    },
    liver: {
        High: ["Cirrhosis", "Hepatocellular Carcinoma Risk", "Liver Failure"],
        Moderate: ["Non-Alcoholic Fatty Liver", "Hepatitis Risk", "Fibrosis"],
        Low: ["Mild Enzyme Elevation", "Fatty Deposits"],
    },
    kidney: {
        High: ["Chronic Kidney Disease", "Renal Failure", "Nephrotic Syndrome"],
        Moderate: ["Early CKD Stage 2", "Proteinuria", "Diabetic Nephropathy"],
        Low: ["Mild GFR Reduction", "Microalbuminuria"],
    },
    diabetes: {
        High: ["Type 2 Diabetes", "Insulin Resistance", "Metabolic Syndrome"],
        Moderate: ["Pre-Diabetes", "Impaired Glucose Tolerance", "Borderline HbA1c"],
        Low: ["Slightly Elevated Glucose", "Mild Insulin Sensitivity"],
    },
};

const ORGAN_RECOMMENDATIONS = {
    heart: {
        High: [
            "Consult a cardiologist immediately for a comprehensive cardiac evaluation",
            "Get an ECG, echocardiogram, and stress test done",
            "Monitor blood pressure daily and maintain a strict low-sodium diet",
            "Consider starting statin therapy under medical supervision",
            "Avoid strenuous physical activity until cleared by a doctor"
        ],
        Moderate: [
            "Schedule a cardiovascular health screening within the next month",
            "Adopt a heart-healthy diet rich in omega-3 fatty acids",
            "Exercise moderately for 30 minutes, 5 days a week",
            "Reduce sodium intake to less than 2,300 mg/day",
            "Monitor cholesterol and blood pressure regularly"
        ],
        Low: [
            "Maintain current healthy lifestyle habits",
            "Continue regular cardiovascular exercise",
            "Get annual heart health checkups",
            "Keep a balanced diet with limited saturated fats"
        ],
    },
    lung: {
        High: [
            "See a pulmonologist urgently for comprehensive lung function tests",
            "Get a chest X-ray and spirometry test immediately",
            "If you smoke, quit immediately — seek cessation support",
            "Avoid exposure to air pollution and secondhand smoke",
            "Consider pulmonary rehabilitation if experiencing breathing difficulty"
        ],
        Moderate: [
            "Schedule spirometry and lung function testing soon",
            "If you smoke, begin a smoking cessation program now",
            "Improve indoor air quality with air purifiers (HEPA filters)",
            "Practice deep breathing exercises daily",
            "Monitor for worsening symptoms like shortness of breath or chronic cough"
        ],
        Low: [
            "Continue avoiding smoking and secondhand smoke exposure",
            "Stay physically active to maintain lung capacity",
            "Get annual flu and pneumonia vaccinations",
            "Practice good respiratory hygiene"
        ],
    },
    liver: {
        High: [
            "Consult a hepatologist immediately for a full liver panel and imaging",
            "Get an abdominal ultrasound and FibroScan to assess liver health",
            "Eliminate alcohol consumption completely",
            "Follow a strict hepatoprotective diet (low fat, high fiber)",
            "Review all medications with your doctor for hepatotoxic effects"
        ],
        Moderate: [
            "Schedule a comprehensive liver function test panel",
            "Limit alcohol consumption to minimal or zero",
            "Adopt a Mediterranean-style diet to support liver health",
            "Maintain a healthy weight — even 5-10% weight loss helps significantly",
            "Avoid unnecessary medications, especially acetaminophen in high doses"
        ],
        Low: [
            "Continue maintaining a healthy diet and weight",
            "Limit alcohol to recommended guidelines",
            "Get liver enzyme tests during annual checkups",
            "Stay hydrated and eat fiber-rich foods"
        ],
    },
    kidney: {
        High: [
            "See a nephrologist urgently for a full renal workup",
            "Get comprehensive tests: creatinine, GFR, urine albumin, electrolyte panel",
            "Strictly control blood pressure (target < 130/80 mmHg)",
            "Limit protein intake to reduce kidney workload",
            "Avoid NSAIDs and nephrotoxic drugs immediately"
        ],
        Moderate: [
            "Schedule kidney function testing within the next 2 weeks",
            "Control blood pressure and blood sugar levels strictly",
            "Reduce sodium and protein intake per your doctor's advice",
            "Stay well-hydrated with at least 2 liters of water daily",
            "Avoid using over-the-counter painkillers regularly"
        ],
        Low: [
            "Stay hydrated and maintain a balanced diet",
            "Monitor kidney function during annual health checkups",
            "Keep blood pressure within normal range",
            "Limit excess protein and sodium intake"
        ],
    },
    diabetes: {
        High: [
            "Consult an endocrinologist immediately for comprehensive metabolic assessment",
            "Get HbA1c, fasting glucose, and insulin resistance tests done",
            "Start a structured diet plan with a registered dietitian",
            "Begin regular blood glucose monitoring (at least twice daily)",
            "Incorporate 150+ minutes of moderate exercise per week"
        ],
        Moderate: [
            "Schedule glucose tolerance test and HbA1c testing",
            "Adopt a low glycemic index diet — reduce refined sugars and carbs",
            "Increase physical activity to at least 30 minutes daily",
            "Monitor fasting blood sugar weekly",
            "Consider metformin if recommended by your doctor"
        ],
        Low: [
            "Maintain a balanced diet with controlled carbohydrate intake",
            "Continue regular physical activity",
            "Get annual fasting glucose and HbA1c checks",
            "Maintain a healthy weight and active lifestyle"
        ],
    },
};

function getRiskColor(riskLevel) {
    if (riskLevel === "High") return new THREE.Color(1.0, 0.08, 0.02);
    if (riskLevel === "Moderate") return new THREE.Color(1.0, 0.65, 0.0);
    if (riskLevel === "Low") return new THREE.Color(0.05, 0.95, 0.3);
    return new THREE.Color(0.3, 0.5, 1.0);
}

function getRiskHex(riskLevel) {
    if (riskLevel === "High") return "#ef4444";
    if (riskLevel === "Moderate") return "#f59e0b";
    if (riskLevel === "Low") return "#10b981";
    return "#6366f1";
}

function getOrganKeyFromMesh(mesh) {
    let node = mesh;
    while (node.parent) {
        if (COLLECTION_TO_ORGAN_KEY[node.name]) return COLLECTION_TO_ORGAN_KEY[node.name];
        node = node.parent;
    }
    return null;
}

function isBodyMesh(mesh) {
    let node = mesh;
    while (node.parent) {
        if (node.name === "human_body") return true;
        node = node.parent;
    }
    return false;
}

// ─── Inner emissive pulse ─────────────────────────────────────────────────────

function useOrganInnerGlow(scene, riskData, hoveredOrganKey) {
    const glowMatsRef = useRef(new Map());
    const originalsRef = useRef(new Map());
    const tRef = useRef(0);

    useEffect(() => {
        if (!scene || !riskData) return;
        const glowMats = new Map();

        scene.traverse((child) => {
            if (!child.isMesh) return;

            if (isBodyMesh(child)) {
                if (!originalsRef.current.has(child.uuid)) {
                    originalsRef.current.set(child.uuid, child.material);
                }
                const mat = child.material.clone();
                mat.transparent = true;
                mat.opacity = 0.55;
                mat.depthWrite = false;
                mat.color = new THREE.Color(0.15, 0.28, 0.55);
                child.material = mat;
                child.raycast = () => null;
                return;
            }

            const organKey = getOrganKeyFromMesh(child);
            if (!organKey || !riskData[organKey]) return;

            if (!originalsRef.current.has(child.uuid)) {
                originalsRef.current.set(child.uuid, child.material);
            }

            const color = getRiskColor(riskData[organKey].risk_level);
            const mat = child.material.clone();
            mat.emissive = color;
            mat.emissiveIntensity = 0.15;
            mat.transparent = false;
            mat.depthWrite = true;
            mat.depthTest = true;
            child.material = mat;

            if (!glowMats.has(organKey)) glowMats.set(organKey, []);
            glowMats.get(organKey).push(mat);
        });

        glowMatsRef.current = glowMats;

        return () => {
            scene.traverse((child) => {
                if (!child.isMesh) return;
                if (originalsRef.current.has(child.uuid)) {
                    child.material = originalsRef.current.get(child.uuid);
                }
            });
        };
    }, [scene, riskData]);

    useFrame((_, delta) => {
        tRef.current += delta;
        glowMatsRef.current.forEach((mats, organKey) => {
            const isHovered = organKey === hoveredOrganKey;
            const speed = isHovered ? 4 : 1.6;
            const minI = 0.05;
            const maxI = isHovered ? 0.55 : 0.28;
            const t = (Math.sin(tRef.current * speed) + 1) / 2;
            mats.forEach((mat) => {
                mat.emissiveIntensity = minI + t * (maxI - minI);
            });
        });
    });
}

// ─── Organ screen-position tracker ───────────────────────────────────────────

function useOrganScreenPositions(scene) {
    const { camera, gl } = useThree();
    const worldCentersRef = useRef({});

    useEffect(() => {
        if (!scene) return;
        const organGroups = {};

        scene.traverse((child) => {
            const key = (() => {
                let node = child;
                while (node.parent) {
                    if (COLLECTION_TO_ORGAN_KEY[node.name]) return COLLECTION_TO_ORGAN_KEY[node.name];
                    node = node.parent;
                }
                return null;
            })();
            if (!key || !child.isMesh) return;
            if (!organGroups[key]) organGroups[key] = [];
            organGroups[key].push(child);
        });

        const centers = {};
        Object.entries(organGroups).forEach(([key, meshes]) => {
            const box = new THREE.Box3();
            meshes.forEach((m) => {
                m.updateWorldMatrix(true, false);
                box.union(new THREE.Box3().setFromObject(m));
            });
            const center = new THREE.Vector3();
            box.getCenter(center);
            centers[key] = center;
        });

        worldCentersRef.current = centers;
    }, [scene]);

    const project = useCallback((organKey) => {
        const center = worldCentersRef.current[organKey];
        if (!center) return null;
        const canvas = gl.domElement;
        const rect = canvas.getBoundingClientRect();
        const ndc = center.clone().project(camera);
        const nudge = ORGAN_ANCHOR_NUDGE[organKey] || { dx: 0, dy: 0 };
        return {
            x: ((ndc.x + 1) / 2) * rect.width + rect.left + nudge.dx,
            y: ((-ndc.y + 1) / 2) * rect.height + rect.top + nudge.dy,
        };
    }, [camera, gl]);

    return project;
}

// ─── Body Scene ───────────────────────────────────────────────────────────────

function BodyScene({ riskData, onOrganClick, onOrganHover, hoveredOrganKey, projectOrganRef }) {
    const { scene } = useGLTF("/models/human_withorgans.glb");

    useOrganInnerGlow(scene, riskData, hoveredOrganKey);

    const project = useOrganScreenPositions(scene);
    useEffect(() => { projectOrganRef.current = project; }, [project, projectOrganRef]);

    const handleClick = useCallback((e) => {
        e.stopPropagation();
        const organKey = getOrganKeyFromMesh(e.object);
        if (!organKey) return;
        onOrganClick(organKey);
    }, [onOrganClick]);

    const handlePointerOver = useCallback((e) => {
        e.stopPropagation();
        const organKey = getOrganKeyFromMesh(e.object);
        if (organKey) { onOrganHover(organKey); document.body.style.cursor = "pointer"; }
    }, [onOrganHover]);

    const handlePointerOut = useCallback(() => {
        onOrganHover(null);
        document.body.style.cursor = "default";
    }, [onOrganHover]);

    return (
        <primitive
            object={scene}
            scale={0.026}
            position={[0, -2.6, 0]}
            onClick={handleClick}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
        />
    );
}

// ─── Arrow live tracker ───────────────────────────────────────────────────────

function ArrowTracker({ organKey, projectOrganRef, onUpdate }) {
    useFrame(() => {
        if (!projectOrganRef.current) return;
        const pos = projectOrganRef.current(organKey);
        if (pos) onUpdate(pos);
    });
    return null;
}

// ─── Spinning Organ ───────────────────────────────────────────────────────────

function SpinningOrgan({ path }) {
    const { scene } = useGLTF(path);
    const spinRef = useRef();
    const rotFix = ORGAN_ROTATION_FIX[path] || null;

    const cloned = useMemo(() => {
        const s = scene.clone(true);
        s.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(s);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const scale = 2 / Math.max(size.x, size.y, size.z);
        s.scale.setScalar(scale);
        s.position.sub(center.multiplyScalar(scale));
        return s;
    }, [scene]);

    useFrame((_, delta) => {
        if (spinRef.current) spinRef.current.rotation.y += delta * 0.6;
    });

    return (
        <group ref={spinRef}>
            <group rotation={rotFix ? [rotFix.x, rotFix.y, rotFix.z] : [0, 0, 0]}>
                <primitive object={cloned} />
            </group>
        </group>
    );
}

// ─── Connector Arrow ─────────────────────────────────────────────────────────

function ConnectorArrow({ from, panelRef, hex }) {
    const [to, setTo] = useState(null);

    useEffect(() => {
        if (!panelRef.current) return;
        const update = () => {
            const r = panelRef.current.getBoundingClientRect();
            setTo({ x: r.left + 2, y: r.top + 130 });
        };
        update();
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, [panelRef]);

    if (!from || !to) return null;

    const cx = from.x + (to.x - from.x) * 0.55;
    const cy = Math.min(from.y, to.y) - 32;
    const dx = to.x - cx;
    const dy = to.y - cy;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = dx / len;
    const ny = dy / len;
    const sz = 9;
    const ax = to.x - nx * sz;
    const ay = to.y - ny * sz;
    const px = -ny * sz * 0.45;
    const py = nx * sz * 0.45;

    return (
        <svg style={{
            pointerEvents: "none", position: "fixed", inset: 0, zIndex: 110,
            width: "100vw", height: "100vh", overflow: "visible",
        }}>
            <defs>
                <linearGradient id="arr-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={hex} stopOpacity="0.8" />
                    <stop offset="100%" stopColor={hex} stopOpacity="0.2" />
                </linearGradient>
            </defs>
            <path d={`M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`}
                stroke={hex} strokeWidth="8" strokeOpacity="0.06" fill="none" strokeLinecap="round" />
            <path d={`M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`}
                stroke="url(#arr-grad)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <polygon points={`${to.x},${to.y} ${ax + px},${ay + py} ${ax - px},${ay - py}`}
                fill={hex} opacity="0.7" />
            <circle cx={from.x} cy={from.y} r="4" fill={hex} opacity="0.8" />
            <circle cx={from.x} cy={from.y} r="10" fill={hex} opacity="0.1" />
        </svg>
    );
}

// ─── Risk Legend ──────────────────────────────────────────────────────────────

function RiskLegend({ riskData, selectedOrganKey, onOrganClick }) {
    if (!riskData) return null;
    return (
        <div className="risk-legend">
            <div className="legend-title">
                Organ Risk Analysis
            </div>

            {Object.entries(ORGAN_LABELS).map(([key, label]) => {
                const r = riskData[key];
                if (!r) return null;
                const hex = getRiskHex(r.risk_level);
                const isSelected = key === selectedOrganKey;
                return (
                    <div key={key}
                        onClick={() => onOrganClick(key)}
                        className={`legend-row ${isSelected ? "legend-row--active" : ""}`}
                        style={{ "--risk-hex": hex }}
                    >
                        <div className="legend-dot" style={{ background: hex, boxShadow: `0 0 8px ${hex}50` }} />
                        <span className="legend-name">{label}</span>
                        <div className="legend-bar-wrap">
                            <div className="legend-bar">
                                <div className="legend-bar-fill" style={{
                                    width: `${r.risk_percentage}%`,
                                    background: hex,
                                }} />
                            </div>
                        </div>
                        <span className="legend-pct" style={{ color: hex }}>{r.risk_percentage}%</span>
                    </div>
                );
            })}
        </div>
    );
}

// ─── Full Analysis Modal ──────────────────────────────────────────────────────

function FullAnalysisModal({ organKey, riskData, onClose }) {
    const risk = riskData?.[organKey];
    const label = ORGAN_LABELS[organKey] || organKey;
    const issues = ORGAN_ISSUES[organKey]?.[risk?.risk_level] || [];
    const recommendations = ORGAN_RECOMMENDATIONS[organKey]?.[risk?.risk_level] || [];
    const hex = getRiskHex(risk?.risk_level);

    return (
        <>
            <div className="analysis-overlay" onClick={onClose} />
            <div className="analysis-modal" onClick={(e) => e.stopPropagation()}>
                <button className="analysis-close" onClick={onClose}>✕</button>

                <div className="analysis-header" style={{ "--risk-color": hex }}>
                    <div className="analysis-header-top">
                        <h2 className="analysis-organ-name">{label}</h2>
                        <div className="analysis-risk-badge" style={{ background: `${hex}18`, color: hex, border: `1px solid ${hex}30` }}>
                            {risk?.risk_level} Risk
                        </div>
                    </div>
                    <div className="analysis-risk-meter">
                        <div className="analysis-meter-bar">
                            <div className="analysis-meter-fill" style={{ width: `${risk?.risk_percentage || 0}%`, background: `linear-gradient(90deg, ${hex}88, ${hex})` }} />
                        </div>
                        <span className="analysis-meter-value" style={{ color: hex }}>{risk?.risk_percentage || 0}%</span>
                    </div>
                </div>

                <div className="analysis-body">
                    <div className="analysis-section">
                        <h3 className="analysis-section-title">
                            <span className="analysis-section-icon">⚠</span>
                            Potential Conditions
                        </h3>
                        <div className="analysis-issues-grid">
                            {issues.map((iss, i) => (
                                <div key={i} className="analysis-issue-card" style={{ "--risk-color": hex }}>
                                    <div className="analysis-issue-dot" style={{ background: hex }} />
                                    <span>{iss}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="analysis-section">
                        <h3 className="analysis-section-title">
                            <span className="analysis-section-icon">💡</span>
                            Recommendations
                        </h3>
                        <div className="analysis-recommendations">
                            {recommendations.map((rec, i) => (
                                <div key={i} className="analysis-rec-item">
                                    <div className="analysis-rec-number">{i + 1}</div>
                                    <span>{rec}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="analysis-disclaimer">
                        <strong>Disclaimer:</strong> This analysis is based on machine learning predictions and should not replace professional medical advice. Always consult a qualified healthcare provider for diagnosis and treatment.
                    </div>
                </div>
            </div>
        </>
    );
}

// ─── Organ Detail Popup ───────────────────────────────────────────────────────

function OrganDetailPopup({ organKey, riskData, onClose, panelRef, onViewAnalysis }) {
    const risk = riskData?.[organKey];
    const label = ORGAN_LABELS[organKey] || organKey;
    const modelPath = ORGAN_MODEL_PATHS[organKey];
    const issues = ORGAN_ISSUES[organKey]?.[risk?.risk_level] || [];
    const hex = getRiskHex(risk?.risk_level);

    return (
        <>
            <div onClick={onClose} className="dialog-overlay" />

            <div ref={panelRef} onClick={(e) => e.stopPropagation()} className="organ-dialog" style={{ "--risk-color": hex }}>
                {/* Subtle corner brackets */}
                {[
                    { top: 8, left: 8, borderTop: `1px solid ${hex}40`, borderLeft: `1px solid ${hex}40` },
                    { top: 8, right: 8, borderTop: `1px solid ${hex}40`, borderRight: `1px solid ${hex}40` },
                    { bottom: 8, left: 8, borderBottom: `1px solid ${hex}40`, borderLeft: `1px solid ${hex}40` },
                    { bottom: 8, right: 8, borderBottom: `1px solid ${hex}40`, borderRight: `1px solid ${hex}40` },
                ].map((s, i) => <div key={i} style={{ position: "absolute", width: 12, height: 12, zIndex: 10, ...s }} />)}

                <button onClick={onClose} className="dialog-close">✕</button>

                <div className="dialog-viewer">
                    <Canvas camera={{ position: [0, 0, 2.8], fov: 52 }} gl={{ antialias: true, alpha: true }}>
                        <ambientLight intensity={0.5} />
                        <directionalLight position={[3, 5, 4]} intensity={2.0} />
                        <directionalLight position={[-3, -1, -3]} intensity={0.4} color="#334466" />
                        <pointLight position={[0, 0, 2.5]} color={hex} intensity={2.5} distance={10} />
                        <pointLight position={[0, 2, 0]} color="#aaccff" intensity={0.8} />
                        {modelPath && <SpinningOrgan path={modelPath} />}
                    </Canvas>
                    <div className="viewer-glow" style={{
                        background: `radial-gradient(ellipse at 50% 65%, ${hex}15 0%, transparent 65%)`,
                    }} />
                </div>

                <div className="dialog-info">
                    <h2 className="dialog-title">{label}</h2>

                    <div className="dialog-divider" style={{ background: `linear-gradient(90deg, ${hex}50, transparent)` }} />

                    <div className="dialog-risk-line">
                        <span className="drl-label">Predicted Risk</span>
                        <span className="drl-value" style={{ color: hex }}>{risk?.risk_level || "—"}</span>
                    </div>

                    <div className="dialog-bar-row">
                        <div className="dialog-bar">
                            <div className="dialog-bar-fill" style={{
                                width: `${risk?.risk_percentage || 0}%`,
                                background: `linear-gradient(90deg, ${hex}88, ${hex})`,
                            }} />
                        </div>
                        <span className="dialog-pct" style={{ color: hex }}>{risk?.risk_percentage || 0}%</span>
                    </div>

                    <div className="dialog-issues">
                        <p className="issues-heading">Potential Issues</p>
                        <ul className="issues-list">
                            {issues.map((iss, i) => (
                                <li key={i}>
                                    <div className="issue-bullet" style={{ background: hex }} />
                                    <span>{iss}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <button className="dialog-btn" onClick={onViewAnalysis}>
                        View Full Analysis
                    </button>
                </div>
            </div>
        </>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function HumanBody({ riskData, onBack }) {
    const [selectedOrganKey, setSelectedOrganKey] = useState(null);
    const [hoveredOrganKey, setHoveredOrganKey] = useState(null);
    const [arrowFrom, setArrowFrom] = useState(null);
    const [showAnalysis, setShowAnalysis] = useState(null);
    const panelRef = useRef(null);
    const projectOrganRef = useRef(null);

    const handleClose = useCallback(() => { setSelectedOrganKey(null); setArrowFrom(null); }, []);

    const handleOrganSelect = useCallback((key) => {
        setSelectedOrganKey(key);
        if (projectOrganRef.current) {
            const pos = projectOrganRef.current(key);
            if (pos) setArrowFrom(pos);
        }
    }, []);

    const handleViewAnalysis = useCallback(() => {
        setShowAnalysis(selectedOrganKey);
        handleClose();
    }, [selectedOrganKey, handleClose]);

    const hex = selectedOrganKey ? getRiskHex(riskData?.[selectedOrganKey]?.risk_level) : "#6366f1";

    return (
        <>
            <div className="hb-container">
                {/* Clean background */}
                <div className="hb-bg" />

                {/* 3D Canvas */}
                <div className="hb-canvas-area">
                    <Canvas camera={{ position: [0, 0, 2.8], fov: 50 }} gl={{ antialias: true, alpha: true }}>
                        <ambientLight intensity={0.3} />
                        <directionalLight position={[4, 8, 4]} intensity={0.8} color="#aaccff" />
                        <directionalLight position={[-4, 2, -4]} intensity={0.2} color="#223355" />
                        <pointLight position={[0, 2, 3]} intensity={0.5} color="#3366ff" />
                        <pointLight position={[0, -1, -2]} intensity={0.15} color="#112244" />

                        <BodyScene
                            riskData={riskData}
                            onOrganClick={handleOrganSelect}
                            onOrganHover={setHoveredOrganKey}
                            hoveredOrganKey={hoveredOrganKey}
                            projectOrganRef={projectOrganRef}
                        />

                        {selectedOrganKey && (
                            <ArrowTracker
                                organKey={selectedOrganKey}
                                projectOrganRef={projectOrganRef}
                                onUpdate={setArrowFrom}
                            />
                        )}

                        <OrbitControls
                            target={[0, -1.2, 0]}
                            enablePan={false}
                            minDistance={1.5}
                            maxDistance={6}
                            minPolarAngle={0.2}
                            maxPolarAngle={Math.PI * 0.85}
                        />
                    </Canvas>
                </div>

                {/* Legend */}
                <div className="hb-legend-area">
                    <RiskLegend
                        riskData={riskData}
                        selectedOrganKey={selectedOrganKey}
                        onOrganClick={handleOrganSelect}
                    />
                </div>

                {/* Back button */}
                {onBack && (
                    <button onClick={onBack} className="hb-back-btn">
                        ← New Assessment
                    </button>
                )}

                {/* Hover chip */}
                {hoveredOrganKey && !selectedOrganKey && (
                    <div className="hover-chip">
                        <span>{ORGAN_LABELS[hoveredOrganKey]}</span>
                        {riskData?.[hoveredOrganKey] && (
                            <span className="hover-chip-risk" style={{ color: getRiskHex(riskData[hoveredOrganKey].risk_level) }}>
                                · {riskData[hoveredOrganKey].risk_level} Risk
                            </span>
                        )}
                    </div>
                )}

                <p className="canvas-hint">Click an organ to inspect · Drag to rotate</p>

                {/* Popup + arrow */}
                {selectedOrganKey && (
                    <>
                        <OrganDetailPopup
                            organKey={selectedOrganKey}
                            riskData={riskData}
                            onClose={handleClose}
                            panelRef={panelRef}
                            onViewAnalysis={handleViewAnalysis}
                        />
                        <ConnectorArrow from={arrowFrom} panelRef={panelRef} hex={hex} />
                    </>
                )}
            </div>

            {/* Full Analysis Modal */}
            {showAnalysis && (
                <FullAnalysisModal
                    organKey={showAnalysis}
                    riskData={riskData}
                    onClose={() => setShowAnalysis(null)}
                />
            )}
        </>
    );
}
