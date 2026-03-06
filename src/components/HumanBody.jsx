import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import * as THREE from "three";
import "./HumanBody.css";

// ─── Constants ────────────────────────────────────────────────────────────────

const COLLECTION_TO_ORGAN_KEY = {
  "Heart":    "heart",
  "kidneys":  "kidney",
  "Liver":    "liver",
  "Lungs":    "lung",
  "pancreas": "diabetes",
};

const ORGAN_MODEL_PATHS = {
  heart:    "/models/heart.glb",
  lung:     "/models/lungs.glb",
  liver:    "/models/liver.glb",
  kidney:   "/models/kidneys.glb",
  diabetes: "/models/pancreas.glb",
};

const ORGAN_ROTATION_FIX = {
  "/models/lungs.glb": new THREE.Euler(Math.PI / 2, Math.PI, 0),
};

const ORGAN_LABELS = {
  heart:    "Heart",
  lung:     "Lungs",
  liver:    "Liver",
  kidney:   "Kidneys",
  diabetes: "Pancreas",
};

const ORGAN_ISSUES = {
  heart: {
    High:     ["Coronary Artery Disease", "Heart Failure", "Cardiac Arrest Risk"],
    Moderate: ["Hypertensive Heart Disease", "Arrhythmia", "Mild Cardiomegaly"],
    Low:      ["Minor Valve Irregularity", "Borderline Cholesterol"],
  },
  lung: {
    High:     ["Pulmonary Fibrosis", "COPD", "Lung Cancer Risk"],
    Moderate: ["Chronic Bronchitis", "Mild Emphysema", "Asthma"],
    Low:      ["Seasonal Allergies", "Minor Airway Inflammation"],
  },
  liver: {
    High:     ["Cirrhosis", "Hepatocellular Carcinoma Risk", "Liver Failure"],
    Moderate: ["Non-Alcoholic Fatty Liver", "Hepatitis Risk", "Fibrosis"],
    Low:      ["Mild Enzyme Elevation", "Fatty Deposits"],
  },
  kidney: {
    High:     ["Chronic Kidney Disease", "Renal Failure", "Nephrotic Syndrome"],
    Moderate: ["Early CKD Stage 2", "Proteinuria", "Diabetic Nephropathy"],
    Low:      ["Mild GFR Reduction", "Microalbuminuria"],
  },
  diabetes: {
    High:     ["Type 2 Diabetes", "Insulin Resistance", "Metabolic Syndrome"],
    Moderate: ["Pre-Diabetes", "Impaired Glucose Tolerance", "Borderline HbA1c"],
    Low:      ["Slightly Elevated Glucose", "Mild Insulin Sensitivity"],
  },
};

function getRiskColor(riskLevel) {
  if (riskLevel === "High")     return new THREE.Color(1.0, 0.08, 0.02);
  if (riskLevel === "Moderate") return new THREE.Color(1.0, 0.65, 0.0);
  if (riskLevel === "Low")      return new THREE.Color(0.05, 0.95, 0.3);
  return new THREE.Color(0.3, 0.5, 1.0);
}

function getRiskHex(riskLevel) {
  if (riskLevel === "High")     return "#ff2211";
  if (riskLevel === "Moderate") return "#ffaa00";
  if (riskLevel === "Low")      return "#22ee55";
  return "#5599ff";
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

// ─── Inner emissive pulse — applied directly onto organ materials ─────────────

function useOrganInnerGlow(scene, riskData, hoveredOrganKey) {
  const glowMatsRef  = useRef(new Map());
  const originalsRef = useRef(new Map());
  const tRef         = useRef(0);

  useEffect(() => {
    if (!scene || !riskData) return;
    const glowMats = new Map();

    scene.traverse((child) => {
      if (!child.isMesh) return;

      // X-ray body so organs are visible through it
      if (isBodyMesh(child)) {
        if (!originalsRef.current.has(child.uuid)) {
          originalsRef.current.set(child.uuid, child.material);
        }
        const mat       = child.material.clone();
        mat.transparent = true;
        mat.opacity     = 0.7;
        mat.depthWrite  = false;
        mat.color       = new THREE.Color(0.35, 0.5, 0.75);
        child.material  = mat;
        child.raycast   = () => null;
        return;
      }

      // Organ inner glow — pure emissive on the organ's own mesh, no shell
      const organKey = getOrganKeyFromMesh(child);
      if (!organKey || !riskData[organKey]) return;

      if (!originalsRef.current.has(child.uuid)) {
        originalsRef.current.set(child.uuid, child.material);
      }

      const color = getRiskColor(riskData[organKey].risk_level);
      const mat   = child.material.clone();
      mat.emissive          = color;
      mat.emissiveIntensity = 0.1;  // starts subtle, pulse animates it
      mat.transparent       = false;
      mat.depthWrite        = true;
      mat.depthTest         = true;
      child.material        = mat;

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

  // Smooth sine pulse — organ breathes with light, no external geometry
  useFrame((_, delta) => {
    tRef.current += delta;
    glowMatsRef.current.forEach((mats, organKey) => {
      const isHovered = organKey === hoveredOrganKey;
      const speed = isHovered ? 3.5 : 1.4;
      const minI  = 0.0;
      const maxI = 0.2;
      // (sin+1)/2 gives smooth 0→1 wave
      const t = (Math.sin(tRef.current * speed) + 1) / 2;
      mats.forEach((mat) => {
        mat.emissiveIntensity = minI + t * (maxI - minI);
      });
    });
  });
}

// ─── Body Scene ───────────────────────────────────────────────────────────────

function BodyScene({ riskData, onOrganClick, onClickPoint, hoveredOrganKey, setHoveredOrganKey }) {
  const { scene }      = useGLTF("/models/human_withorgans.glb");
  const { camera, gl } = useThree();

  useOrganInnerGlow(scene, riskData, hoveredOrganKey);

  const handleClick = useCallback((e) => {
    e.stopPropagation();
    const organKey = getOrganKeyFromMesh(e.object);
    if (!organKey) return;
    const canvas = gl.domElement;
    const rect   = canvas.getBoundingClientRect();
    const wp     = e.point.clone().project(camera);
    const sx     = ((wp.x + 1) / 2) * rect.width  + rect.left;
    const sy     = ((-wp.y + 1) / 2) * rect.height + rect.top;
    onClickPoint({ x: sx, y: sy });
    onOrganClick(organKey);
  }, [camera, gl, onOrganClick, onClickPoint]);

  const handlePointerOver = useCallback((e) => {
    e.stopPropagation();
    const organKey = getOrganKeyFromMesh(e.object);
    if (organKey) {
      setHoveredOrganKey(organKey);
      document.body.style.cursor = "pointer";
    }
  }, [setHoveredOrganKey]);

  const handlePointerOut = useCallback(() => {
    setHoveredOrganKey(null);
    document.body.style.cursor = "default";
  }, [setHoveredOrganKey]);

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

// ─── Spinning Organ in Dialog ─────────────────────────────────────────────────
function SpinningOrgan({ path }) {
  const { scene } = useGLTF(path);
  const spinRef   = useRef();
  const rotFix    = ORGAN_ROTATION_FIX[path] || null;

  const cloned = useMemo(() => {
    const s = scene.clone(true);
    s.updateMatrixWorld(true);
    const box    = new THREE.Box3().setFromObject(s);
    const size   = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const scale  = 1.7 / Math.max(size.x, size.y, size.z);
    s.scale.setScalar(scale);
    s.position.sub(center.multiplyScalar(scale));
    return s;
  }, [scene]);

  useFrame((_, delta) => {
    if (spinRef.current) spinRef.current.rotation.y += delta * 0.5;
  });

  return (
    <group ref={spinRef}>
      <group rotation={rotFix ? [rotFix.x, rotFix.y, rotFix.z] : [0, 0, 0]}>
        <primitive object={cloned} />
      </group>
    </group>
  );
}

// ─── SVG Connector Beam ───────────────────────────────────────────────────────

function ConnectorBeam({ fromPx, dialogRef, hex }) {
  const [to, setTo] = useState(null);

  useEffect(() => {
    if (!dialogRef.current) return;
    const update = () => {
      const r = dialogRef.current.getBoundingClientRect();
      setTo({ x: r.left, y: r.top + r.height * 0.28 });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [dialogRef]);

  if (!fromPx || !to) return null;

  const mx = (fromPx.x + to.x) / 2;
  const my = Math.min(fromPx.y, to.y) - 30;

  return (
    <svg style={{ pointerEvents: "none", position: "fixed", inset: 0, zIndex: 90, width: "100vw", height: "100vh" }}>
      <defs>
        <linearGradient id="beam-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor={hex} stopOpacity="1.0" />
          <stop offset="100%" stopColor={hex} stopOpacity="0.25" />
        </linearGradient>
      </defs>
      {/* Soft wide glow behind — no blur filter, just low opacity thick stroke */}
      <path d={`M ${fromPx.x} ${fromPx.y} Q ${mx} ${my} ${to.x} ${to.y}`}
        stroke={hex} strokeWidth="10" strokeOpacity="0.12" fill="none" strokeLinecap="round" />
      {/* Sharp crisp main beam */}
      <path d={`M ${fromPx.x} ${fromPx.y} Q ${mx} ${my} ${to.x} ${to.y}`}
        stroke="url(#beam-grad)" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Origin dot — sharp */}
      <circle cx={fromPx.x} cy={fromPx.y} r="4"  fill={hex} opacity="1.0" />
      <circle cx={fromPx.x} cy={fromPx.y} r="9"  fill={hex} opacity="0.15" />
    </svg>
  );
}

// ─── Risk Legend ──────────────────────────────────────────────────────────────

function RiskLegend({ riskData }) {
  if (!riskData) return null;
  return (
    <div className="risk-legend">
      <p className="legend-title">ORGAN RISK ANALYSIS</p>
      {Object.entries(ORGAN_LABELS).map(([key, label]) => {
        const r = riskData[key];
        if (!r) return null;
        const hex = getRiskHex(r.risk_level);
        return (
          <div key={key} className="legend-row">
            <span className="legend-dot"  style={{ background: hex, boxShadow: `0 0 7px ${hex}` }} />
            <span className="legend-name">{label}</span>
            <div className="legend-bar-wrap">
              <div className="legend-bar">
                <div className="legend-bar-fill" style={{ width: `${r.risk_percentage}%`, background: hex, boxShadow: `0 0 6px ${hex}88` }} />
              </div>
            </div>
            <span className="legend-pct" style={{ color: hex }}>{r.risk_percentage}%</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Organ Dialog ─────────────────────────────────────────────────────────────

function OrganDialog({ organKey, riskData, onClose, dialogRef }) {
  const risk      = riskData?.[organKey];
  const label     = ORGAN_LABELS[organKey] || organKey;
  const modelPath = ORGAN_MODEL_PATHS[organKey];
  const issues    = ORGAN_ISSUES[organKey]?.[risk?.risk_level] || [];
  const hex       = getRiskHex(risk?.risk_level);

  return (
    <div className="organ-dialog" style={{ "--risk-color": hex }} ref={dialogRef}>
      <span className="dc dc-tl" /><span className="dc dc-tr" />
      <span className="dc dc-bl" /><span className="dc dc-br" />
      <button className="dialog-close" onClick={onClose}>✕</button>

      <div className="dialog-viewer">
        <Canvas camera={{ position: [0, -0.3, 3.2], fov: 55 }} gl={{ antialias: true, alpha: true }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[3, 5, 4]}   intensity={1.8} />
          <directionalLight position={[-3, -1, -3]} intensity={0.4} color="#334466" />
          <pointLight position={[0, 0, 2.5]} color={hex} intensity={1.5} distance={8} />
          {modelPath && <SpinningOrgan path={modelPath} />}
        </Canvas>
        <div className="viewer-glow" style={{ background: `radial-gradient(ellipse at 50% 60%, ${hex}30 0%, transparent 70%)` }} />
      </div>

      <div className="dialog-info">
        <h2 className="dialog-title">{label}</h2>

        <div className="dialog-risk-line">
          <span className="drl-label">Predicted Failure Risk:</span>
          <span className="drl-value" style={{ color: hex }}>{risk?.risk_level || "—"}</span>
        </div>

        <div className="dialog-bar-row">
          <div className="dialog-bar">
            <div className="dialog-bar-fill" style={{
              width: `${risk?.risk_percentage || 0}%`,
              background: `linear-gradient(90deg, ${hex}66, ${hex})`,
              boxShadow: `0 0 12px ${hex}88`,
            }} />
          </div>
          <span className="dialog-pct" style={{ color: hex }}>{risk?.risk_percentage || 0}%</span>
        </div>

        <div className="dialog-issues">
          <p className="issues-heading">Potential Issues:</p>
          <ul className="issues-list">
            {issues.map((iss, i) => (
              <li key={i}>
                <span className="issue-bullet" style={{
                  background:  i % 2 === 0 ? "#4488ff" : hex,
                  boxShadow: `0 0 5px ${i % 2 === 0 ? "#4488ff" : hex}`,
                }} />
                {iss}
              </li>
            ))}
          </ul>
        </div>

        <button className="dialog-btn">View Details</button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function HumanBody({ riskData }) {
  const [selectedOrganKey, setSelectedOrganKey] = useState(null);
  const [hoveredOrganKey,  setHoveredOrganKey]  = useState(null);
  const [clickPoint,       setClickPoint]        = useState(null);
  const dialogRef = useRef(null);

  const handleClose = () => { setSelectedOrganKey(null); setClickPoint(null); };
  const hex = selectedOrganKey ? getRiskHex(riskData?.[selectedOrganKey]?.risk_level) : "#5599ff";

  return (
    <div className="hb-root">
      <RiskLegend riskData={riskData} />

      <div className="hb-canvas-wrap">
        <Canvas
          camera={{ position: [0, 0, 2.8], fov: 50 }}
          gl={{ antialias: true, alpha: true }}
        >
          <ambientLight intensity={0.35} />
          <directionalLight position={[4, 8, 4]}  intensity={0.7}  color="#aaccff" />
          <directionalLight position={[-4, 2, -4]} intensity={0.25} color="#223355" />
          <pointLight       position={[0, 2, 3]}   intensity={0.4}  color="#3366ff" />

          <BodyScene
            riskData={riskData}
            onOrganClick={setSelectedOrganKey}
            onClickPoint={setClickPoint}
            hoveredOrganKey={hoveredOrganKey}
            setHoveredOrganKey={setHoveredOrganKey}
          />

          <OrbitControls
            target={[0, -1.2, 0]}
            enablePan={false}
            minDistance={1.5}
            maxDistance={6}
            minPolarAngle={0.2}
            maxPolarAngle={Math.PI * 0.85}
          />
        </Canvas>

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

        <p className="canvas-hint">Click an organ to inspect</p>
      </div>

      {selectedOrganKey && (
        <>
          <ConnectorBeam fromPx={clickPoint} dialogRef={dialogRef} hex={hex} />
          <div className="dialog-overlay" onClick={handleClose}>
            <div className="dialog-wrapper" onClick={(e) => e.stopPropagation()}>
              <OrganDialog
                organKey={selectedOrganKey}
                riskData={riskData}
                onClose={handleClose}
                dialogRef={dialogRef}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}