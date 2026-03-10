import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import * as THREE from "three";

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


// Useful when two organs share overlapping bounding boxes
const ORGAN_ANCHOR_NUDGE = {
  lung:    { dx: 38, dy: -10 },  // shift right so it doesn't overlap heart
  heart:   { dx: 0,  dy: 0  },
  liver:   { dx: 0,  dy: 0  },
  kidney:  { dx: -20,  dy: 0  },
  diabetes:{ dx: 0,  dy: 0  },
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

function getRiskColor(riskLevel) {
  if (riskLevel === "High") return new THREE.Color(1.0, 0.08, 0.02);
  if (riskLevel === "Moderate") return new THREE.Color(1.0, 0.65, 0.0);
  if (riskLevel === "Low") return new THREE.Color(0.05, 0.95, 0.3);
  return new THREE.Color(0.3, 0.5, 1.0);
}

function getRiskHex(riskLevel) {
  if (riskLevel === "High") return "#ff3322";
  if (riskLevel === "Moderate") return "#ffaa00";
  if (riskLevel === "Low") return "#22ee55";
  return "#4488ff";
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

// ─── Scanline overlay ─────────────────────────────────────────────────────────

function ScanlineOverlay() {
  return (
    <div style={{
      position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1,
      background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,30,80,0.03) 2px, rgba(0,30,80,0.03) 4px)",
    }} />
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
  const py =  nx * sz * 0.45;

  return (
    <svg style={{
      pointerEvents: "none", position: "fixed", inset: 0, zIndex: 110,
      width: "100vw", height: "100vh", overflow: "visible",
    }}>
      <defs>
        <linearGradient id="arr-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={hex} stopOpacity="1" />
          <stop offset="100%" stopColor={hex} stopOpacity="0.3" />
        </linearGradient>
        <filter id="arr-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <path d={`M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`}
        stroke={hex} strokeWidth="12" strokeOpacity="0.1" fill="none" strokeLinecap="round" />
      <path d={`M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`}
        stroke="url(#arr-grad)" strokeWidth="2" fill="none" strokeLinecap="round" filter="url(#arr-glow)" />
      <polygon points={`${to.x},${to.y} ${ax + px},${ay + py} ${ax - px},${ay - py}`}
        fill={hex} opacity="0.95" filter="url(#arr-glow)" />
      <circle cx={from.x} cy={from.y} r="5" fill={hex} opacity="1" />
      <circle cx={from.x} cy={from.y} r="12" fill={hex} opacity="0.18" />
      <circle cx={from.x} cy={from.y} r="20" fill={hex} opacity="0.07" />
    </svg>
  );
}

// ─── Risk Legend ──────────────────────────────────────────────────────────────

function RiskLegend({ riskData, selectedOrganKey, onOrganClick }) {
  if (!riskData) return null;
  return (
    <div style={{
      width: "260px",
      padding: "28px 22px",
      display: "flex", flexDirection: "column",
      fontFamily: "'Rajdhani', sans-serif",
    }}>
      <div style={{
        fontSize: "11px", letterSpacing: "0.28em", color: "rgba(100,180,255,0.6)",
        marginBottom: "24px", textTransform: "uppercase", fontWeight: 700,
        borderBottom: "1px solid rgba(60,140,255,0.15)", paddingBottom: "14px",
        display: "flex", alignItems: "center", gap: "8px",
      }}>
        <span style={{
          display: "inline-block", width: "6px", height: "6px", borderRadius: "50%",
          background: "#4488ff", boxShadow: "0 0 8px #4488ff",
        }} />
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
            style={{
              display: "flex", alignItems: "center", gap: "12px",
              padding: "12px 14px", borderRadius: "5px", cursor: "pointer",
              background: isSelected ? `${hex}12` : "transparent",
              border: isSelected ? `1px solid ${hex}40` : "1px solid transparent",
              transition: "all 0.2s", marginBottom: "6px",
            }}
          >
            <div style={{
              width: "10px", height: "10px", borderRadius: "50%", flexShrink: 0,
              background: hex, boxShadow: `0 0 10px ${hex}, 0 0 20px ${hex}55`,
            }} />
            <span style={{ fontSize: "15px", color: "#b8d0f0", width: "68px", fontWeight: 600, letterSpacing: "0.04em" }}>{label}</span>
            <div style={{ flex: 1, height: "4px", background: "rgba(255,255,255,0.07)", borderRadius: "2px", overflow: "hidden" }}>
              <div style={{
                width: `${r.risk_percentage}%`, height: "100%", borderRadius: "2px",
                background: hex, boxShadow: `0 0 8px ${hex}`,
                transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)",
              }} />
            </div>
            <span style={{ fontSize: "14px", fontWeight: 700, color: hex, width: "46px", textAlign: "right" }}>{r.risk_percentage}%</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Organ Detail Popup ───────────────────────────────────────────────────────

function OrganDetailPopup({ organKey, riskData, onClose, panelRef }) {
  const risk = riskData?.[organKey];
  const label = ORGAN_LABELS[organKey] || organKey;
  const modelPath = ORGAN_MODEL_PATHS[organKey];
  const issues = ORGAN_ISSUES[organKey]?.[risk?.risk_level] || [];
  const hex = getRiskHex(risk?.risk_level);

  return (
    <>
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(1,5,18,0.55)",
        backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
        animation: "backdropIn 0.2s ease",
      }} />

      <div ref={panelRef} onClick={(e) => e.stopPropagation()} style={{
        position: "fixed", top: "50%", right: "5vw",
        transform: "translateY(-50%)",
        zIndex: 105, width: "340px",
        background: "linear-gradient(160deg, rgba(8,18,48,0.98) 0%, rgba(4,10,28,0.99) 100%)",
        border: `1px solid ${hex}50`, borderRadius: "8px", overflow: "hidden",
        boxShadow: `0 0 80px ${hex}20, 0 40px 100px rgba(0,0,0,0.95), inset 0 0 0 1px rgba(255,255,255,0.04)`,
        animation: "popupIn 0.3s cubic-bezier(0.34,1.56,0.64,1)",
        fontFamily: "'Rajdhani', sans-serif",
      }}>
        {[
          { top: 8, left: 8,    borderTop:    `1.5px solid ${hex}`, borderLeft:  `1.5px solid ${hex}` },
          { top: 8, right: 8,   borderTop:    `1.5px solid ${hex}`, borderRight: `1.5px solid ${hex}` },
          { bottom: 8, left: 8,  borderBottom: `1.5px solid ${hex}`, borderLeft:  `1.5px solid ${hex}` },
          { bottom: 8, right: 8, borderBottom: `1.5px solid ${hex}`, borderRight: `1.5px solid ${hex}` },
        ].map((s, i) => <div key={i} style={{ position: "absolute", width: 14, height: 14, zIndex: 10, ...s }} />)}

        <button onClick={onClose} style={{
          position: "absolute", top: 12, right: 14, zIndex: 20,
          background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
          color: "rgba(180,210,255,0.7)", width: 30, height: 30, borderRadius: "50%",
          fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "sans-serif",
        }}>✕</button>

        <div style={{
          width: "100%", height: "260px", position: "relative",
          background: "radial-gradient(ellipse at center, rgba(15,30,70,0.9) 0%, rgba(2,6,18,1) 100%)",
          borderBottom: `1px solid ${hex}22`,
        }}>
          <Canvas camera={{ position: [0, 0, 2.8], fov: 52 }} gl={{ antialias: true, alpha: true }}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[3, 5, 4]} intensity={2.0} />
            <directionalLight position={[-3, -1, -3]} intensity={0.4} color="#334466" />
            <pointLight position={[0, 0, 2.5]} color={hex} intensity={2.5} distance={10} />
            <pointLight position={[0, 2, 0]} color="#aaccff" intensity={0.8} />
            {modelPath && <SpinningOrgan path={modelPath} />}
          </Canvas>
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            background: `radial-gradient(ellipse at 50% 65%, ${hex}25 0%, transparent 65%)`,
          }} />
        </div>

        <div style={{ padding: "20px 24px 24px" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "4px" }}>
            <h2 style={{ fontSize: "38px", fontWeight: 700, color: "#eef4ff", letterSpacing: "0.02em", lineHeight: 1, margin: 0 }}>{label}</h2>
            
          </div>

          <div style={{ height: "1px", background: `linear-gradient(90deg, ${hex}66, transparent)`, margin: "12px 0" }} />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
            <span style={{ fontSize: "13px", color: "#a0b8d8", fontWeight: 500 }}>Predicted Failure Risk</span>
            <span style={{ fontSize: "15px", fontWeight: 700, color: hex, letterSpacing: "0.08em", textShadow: `0 0 14px ${hex}` }}>{risk?.risk_level || "—"}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
            <div style={{ flex: 1, height: "6px", background: "rgba(255,255,255,0.07)", borderRadius: "3px", overflow: "hidden" }}>
              <div style={{
                width: `${risk?.risk_percentage || 0}%`, height: "100%", borderRadius: "3px",
                background: `linear-gradient(90deg, ${hex}88, ${hex})`, boxShadow: `0 0 10px ${hex}88`,
                transition: "width 1s cubic-bezier(0.4,0,0.2,1)",
              }} />
            </div>
            <span style={{ fontSize: "15px", fontWeight: 700, color: hex, width: "40px", textAlign: "right" }}>{risk?.risk_percentage || 0}%</span>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <p style={{ fontSize: "11px", color: "rgba(100,160,255,0.5)", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: "10px", fontWeight: 600 }}>Potential Issues</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {issues.map((iss, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{
                    width: "7px", height: "7px", borderRadius: "50%", flexShrink: 0,
                    background: i % 2 === 0 ? "#4488ff" : hex, boxShadow: `0 0 6px ${i % 2 === 0 ? "#4488ff" : hex}`,
                  }} />
                  <span style={{ fontSize: "14px", color: "#c0d4f0" }}>{iss}</span>
                </div>
              ))}
            </div>
          </div>

          <button style={{
            width: "100%", padding: "14px",
            background: "linear-gradient(135deg, rgba(20,70,180,0.95), rgba(15,50,130,0.95))",
            border: "1px solid rgba(80,150,255,0.45)", borderRadius: "4px", color: "#e0eeff",
            fontFamily: "'Rajdhani', sans-serif", fontSize: "14px", fontWeight: 600,
            letterSpacing: "0.14em", textTransform: "uppercase", cursor: "pointer",
          }}>View Full Analysis</button>
        </div>
      </div>
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function HumanBody({ riskData }) {
  const [selectedOrganKey, setSelectedOrganKey] = useState(null);
  const [hoveredOrganKey, setHoveredOrganKey] = useState(null);
  const [arrowFrom, setArrowFrom] = useState(null);
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

  const hex = selectedOrganKey ? getRiskHex(riskData?.[selectedOrganKey]?.risk_level) : "#4488ff";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Exo+2:wght@300;400;500;600&display=swap');
        @keyframes backdropIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes popupIn {
          from { opacity: 0; transform: translateY(-50%) translateX(20px) scale(0.96); }
          to   { opacity: 1; transform: translateY(-50%) translateX(0) scale(1); }
        }
        @keyframes chipIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-8px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>

      {/* Root: full screen, position relative so children can be absolute */}
      <div style={{
        width: "100%", height: "100%", position: "relative", overflow: "hidden",
        background: "linear-gradient(135deg, #020a1e 0%, #030d26 40%, #020812 100%)",
        fontFamily: "'Exo 2', sans-serif", color: "#c8deff",
      }}>
        {/* Background grid */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: `linear-gradient(rgba(30,80,200,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(30,80,200,0.04) 1px, transparent 1px)`,
          backgroundSize: "50px 50px",
          maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)",
        }} />
        <div style={{ position: "absolute", width: "500px", height: "500px", borderRadius: "50%", top: "-100px", left: "30%", background: "radial-gradient(circle, rgba(20,60,180,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", width: "300px", height: "300px", borderRadius: "50%", bottom: 0, right: "20%", background: "radial-gradient(circle, rgba(10,40,120,0.1) 0%, transparent 70%)", pointerEvents: "none" }} />

        {/* ── 3D Canvas: truly full-screen, model centred in full viewport ── */}
        <div style={{ position: "absolute", inset: 0 }}>
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
          <ScanlineOverlay />
        </div>

        {/* ── Legend: absolutely positioned left, sits on top of canvas ── */}
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0,
          display: "flex", alignItems: "center",
          zIndex: 10,
          // subtle dark backing so legend text is readable over the 3D scene
          background: "linear-gradient(90deg, rgba(2,8,22,0.75) 0%, rgba(2,8,22,0.4) 80%, transparent 100%)",
        }}>
          <RiskLegend
            riskData={riskData}
            selectedOrganKey={selectedOrganKey}
            onOrganClick={handleOrganSelect}
          />
        </div>

        {/* Hover chip */}
        {hoveredOrganKey && !selectedOrganKey && (
          <div style={{
            position: "absolute", top: "20px", left: "50%",
            transform: "translateX(-50%)", zIndex: 20,
            background: "rgba(3,10,28,0.9)",
            border: `1px solid ${getRiskHex(riskData?.[hoveredOrganKey]?.risk_level)}55`,
            borderRadius: "20px", padding: "7px 20px", fontSize: "14px",
            fontFamily: "'Rajdhani', sans-serif", fontWeight: 600, letterSpacing: "0.1em",
            color: "#c8deff", display: "flex", gap: "8px", alignItems: "center",
            pointerEvents: "none", backdropFilter: "blur(8px)", animation: "chipIn 0.15s ease",
          }}>
            <span>{ORGAN_LABELS[hoveredOrganKey]}</span>
            {riskData?.[hoveredOrganKey] && (
              <span style={{ fontWeight: 700, color: getRiskHex(riskData[hoveredOrganKey].risk_level) }}>
                · {riskData[hoveredOrganKey].risk_level} Risk
              </span>
            )}
          </div>
        )}

        <p style={{
          position: "absolute", bottom: "16px", left: "50%", transform: "translateX(-50%)",
          fontSize: "10px", letterSpacing: "0.2em", color: "rgba(80,140,255,0.3)",
          fontFamily: "'Rajdhani', sans-serif", textTransform: "uppercase",
          whiteSpace: "nowrap", pointerEvents: "none", margin: 0, zIndex: 10,
        }}>Click an organ to inspect · Drag to rotate</p>

        {/* Popup + arrow */}
        {selectedOrganKey && (
          <>
            <OrganDetailPopup
              organKey={selectedOrganKey}
              riskData={riskData}
              onClose={handleClose}
              panelRef={panelRef}
            />
            <ConnectorArrow from={arrowFrom} panelRef={panelRef} hex={hex} />
          </>
        )}
      </div>
    </>
  );
}