import { useState } from "react";
import Layout from "./components/Layout";
import HealthForm from "./components/HealthForm";
import HumanBody from "./components/HumanBody";
import "./App.css";

export default function App() {
    const [riskData, setRiskData] = useState(null);
    const [showForm, setShowForm] = useState(true);

    const handleResult = (data) => {
        setRiskData(data);
        setShowForm(false);
    };

    const handleBackToForm = () => {
        setShowForm(true);
    };

    return (
        <Layout>
            {showForm ? (
                <HealthForm onResult={handleResult} />
            ) : (
                <HumanBody riskData={riskData} onBack={handleBackToForm} />
            )}
        </Layout>
    );
}
