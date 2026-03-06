import { useState } from "react";
import Layout from "./components/Layout";
import HealthForm from "./components/HealthForm";
import HumanBody from "./components/HumanBody";

export default function App() {
  const [riskData, setRiskData] = useState(null);

  return (
    <Layout>
      {!riskData ? (
        <HealthForm onResult={setRiskData} />
      ) : (
        <HumanBody riskData={riskData} />
      )}
    </Layout>
  );
}