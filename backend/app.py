from flask import Flask, request, jsonify
import joblib
import numpy as np
import pandas as pd
from flask_cors import CORS
import warnings

# Suppress sklearn version warnings
warnings.filterwarnings('ignore', category=UserWarning)
warnings.filterwarnings('ignore', message='.*InconsistentVersionWarning.*')

app = Flask(__name__)
CORS(app)

# Load all models and scalers with error handling
def load_model_safe(path, model_name):
    try:
        model = joblib.load(path)
        # Force models to use CPU if they were trained on GPU
        if hasattr(model, 'set_params'):
            try:
                model.set_params(device='cpu')
            except:
                pass
        # For calibrated models, set base estimator to CPU
        if hasattr(model, 'calibrated_classifiers_'):
            for calibrated_clf in model.calibrated_classifiers_:
                if hasattr(calibrated_clf.estimator, 'set_params'):
                    try:
                        calibrated_clf.estimator.set_params(device='cpu')
                    except:
                        pass
        print(f"✓ {model_name} loaded successfully")
        return model
    except Exception as e:
        print(f"✗ Error loading {model_name}: {e}")
        return None

models = {
    'diabetes': load_model_safe('model/diabetes_model_gpu.pkl', 'Diabetes'),
    'heart': load_model_safe('model/heart_model_gpu.pkl', 'Heart'),
    'kidney': load_model_safe('model/kidney_model_gpu.pkl', 'Kidney'),
    'liver': load_model_safe('model/liver_model_gpu_calibrated.pkl', 'Liver'),
    'lung': load_model_safe('model/lung_model_gpu_calibrated.pkl', 'Lung')
}

scalers = {
    'diabetes': joblib.load('model/diabetes_scaler.pkl'),
    'heart': joblib.load('model/heart_scaler.pkl'),
    'kidney': joblib.load('model/kidney_scaler.pkl')
}


def prepare_diabetes_input(data):
    """Prepare input for diabetes model"""
    feature_names = [
        'HighBP', 'HighChol', 'CholCheck', 'BMI', 'Smoker', 'Stroke',
        'HeartDiseaseorAttack', 'PhysActivity', 'HvyAlcoholConsump',
        'GenHlth', 'MentHlth', 'PhysHlth', 'DiffWalk', 'Sex', 'Age'
    ]
    features = [
        data.get('high_bp', 0),
        data.get('high_chol', 0),
        data.get('chol_check', 1),
        data.get('bmi', 25.0),
        data.get('smoker', 0),
        data.get('stroke', 0),
        data.get('heart_disease', 0),
        data.get('physical_activity', 1),
        data.get('heavy_alcohol', 0),
        data.get('gen_health', 3),
        data.get('mental_health', 0),
        data.get('physical_health', 0),
        data.get('diff_walk', 0),
        data.get('gender', 1),
        data.get('age', 5)
    ]
    X = pd.DataFrame([features], columns=feature_names)
    X_scaled = scalers['diabetes'].transform(X)
    return X_scaled


def prepare_heart_input(data):
    """Prepare input for heart model"""
    feature_names = ['age_years', 'gender', 'height', 'weight', 'ap_hi', 'ap_lo',
                     'cholesterol', 'gluc', 'smoke', 'alco', 'active']
    features = [
        data.get('age', 50),
        data.get('gender', 2),
        data.get('height', 170),
        data.get('weight', 70),
        data.get('systolic_bp', 120),
        data.get('diastolic_bp', 80),
        data.get('cholesterol', 1),
        data.get('glucose', 1),
        data.get('smoker', 0),
        data.get('alcohol', 0),
        data.get('active', 1)
    ]
    X = pd.DataFrame([features], columns=feature_names)
    X_scaled = scalers['heart'].transform(X)
    return X_scaled


def prepare_kidney_input(data):
    """Prepare input for kidney model"""
    feature_names = [
        'Age', 'BMI', 'Smoking', 'PhysicalActivity', 'FamilyHistoryKidneyDisease',
        'SerumCreatinine', 'BUNLevels', 'GFR', 'ProteinInUrine', 'ACR',
        'SerumElectrolytesSodium', 'SerumElectrolytesPotassium',
        'SerumElectrolytesCalcium', 'SerumElectrolytesPhosphorus',
        'HemoglobinLevels', 'SystolicBP', 'DiastolicBP', 'Edema'
    ]
    features = [
        data.get('age', 50),
        data.get('bmi', 25.0),
        data.get('smoker', 0),
        data.get('physical_activity', 1),
        data.get('family_history_kidney', 0),
        data.get('serum_creatinine', 1.0),
        data.get('bun_levels', 15.0),
        data.get('gfr', 90.0),
        data.get('protein_in_urine', 0),
        data.get('acr', 15.0),
        data.get('sodium', 140.0),
        data.get('potassium', 4.0),
        data.get('calcium', 9.5),
        data.get('phosphorus', 3.5),
        data.get('hemoglobin', 14.0),
        data.get('systolic_bp', 120),
        data.get('diastolic_bp', 80),
        data.get('edema', 0)
    ]
    X = pd.DataFrame([features], columns=feature_names)
    X_scaled = scalers['kidney'].transform(X)
    return X_scaled


def prepare_liver_input(data):
    """Prepare input for liver model"""
    df_dict = {
        'Age_of_the_patient': data.get('age', 50),
        'Gender_of_the_patient': data.get('gender', 1),
        'Total_Bilirubin': data.get('total_bilirubin', 0.8),
        'Direct_Bilirubin': data.get('direct_bilirubin', 0.3),
        'Alkphos_Alkaline_Phosphotase': data.get('alkaline_phosphotase', 200),
        'Sgpt_Alamine_Aminotransferase': data.get('sgpt', 25),
        'Sgot_Aspartate_Aminotransferase': data.get('sgot', 30),
        'Total_Protiens': data.get('total_proteins', 7.0),
        'ALB_Albumin': data.get('albumin', 4.0),
        'AG_Ratio_Albumin_and_Globulin_Ratio': data.get('ag_ratio', 1.2)
    }
    X = pd.DataFrame([df_dict])
    return X


def prepare_lung_input(data):
    """Prepare input for lung model"""
    mental_stress = data.get('mental_stress', 0)
    immune_weakness = data.get('immune_weakness', 0)
    stress_immune = mental_stress * immune_weakness

    features = [
        data.get('age', 50),
        data.get('gender', 1),
        data.get('smoker', 0),
        data.get('finger_discoloration', 0),
        mental_stress,
        data.get('exposure_to_pollution', 0),
        data.get('long_term_illness', 0),
        data.get('energy_level', 5),
        immune_weakness,
        data.get('breathing_issue', 0),
        data.get('alcohol', 0),
        data.get('smoking_family_history', 0),
        stress_immune
    ]
    X = np.array(features).reshape(1, -1)
    return X


@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.json

        results = {}

        # Diabetes prediction
        if models['diabetes'] is not None:
            try:
                X_diabetes = prepare_diabetes_input(data)
                diabetes_pred = float(models['diabetes'].predict_proba(X_diabetes)[0][1])
                results['diabetes'] = {
                    'risk_percentage': round(diabetes_pred * 100, 2),
                    'risk_level': get_risk_level(diabetes_pred)
                }
            except Exception as e:
                print(f"Diabetes prediction error: {e}")
                results['diabetes'] = {'error': str(e), 'risk_percentage': 0, 'risk_level': 'Error'}

        # Heart prediction
        if models['heart'] is not None:
            try:
                X_heart = prepare_heart_input(data)
                heart_pred = float(models['heart'].predict_proba(X_heart)[0][1])
                results['heart'] = {
                    'risk_percentage': round(heart_pred * 100, 2),
                    'risk_level': get_risk_level(heart_pred)
                }
            except Exception as e:
                print(f"Heart prediction error: {e}")
                results['heart'] = {'error': str(e), 'risk_percentage': 0, 'risk_level': 'Error'}

        # Kidney prediction
        if models['kidney'] is not None:
            try:
                X_kidney = prepare_kidney_input(data)
                kidney_pred = float(models['kidney'].predict_proba(X_kidney)[0][1])
                results['kidney'] = {
                    'risk_percentage': round(kidney_pred * 100, 2),
                    'risk_level': get_risk_level(kidney_pred)
                }
            except Exception as e:
                print(f"Kidney prediction error: {e}")
                results['kidney'] = {'error': str(e), 'risk_percentage': 0, 'risk_level': 'Error'}

        # Liver prediction
        if models['liver'] is not None:
            try:
                X_liver = prepare_liver_input(data)
                liver_pred = float(models['liver'].predict_proba(X_liver)[0][1])
                results['liver'] = {
                    'risk_percentage': round(liver_pred * 100, 2),
                    'risk_level': get_risk_level(liver_pred)
                }
            except Exception as e:
                print(f"Liver prediction error: {e}")
                results['liver'] = {'error': str(e), 'risk_percentage': 0, 'risk_level': 'Error'}

        # Lung prediction
        if models['lung'] is not None:
            try:
                X_lung = prepare_lung_input(data)
                lung_pred = float(models['lung'].predict_proba(X_lung)[0][1])
                results['lung'] = {
                    'risk_percentage': round(lung_pred * 100, 2),
                    'risk_level': get_risk_level(lung_pred)
                }
            except Exception as e:
                print(f"Lung prediction error: {e}")
                results['lung'] = {'error': str(e), 'risk_percentage': 0, 'risk_level': 'Error'}

        return jsonify(results)

    except Exception as e:
        print(f"General prediction error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


def get_risk_level(probability):
    """Convert probability to risk level"""
    if probability < 0.3:
        return 'Low'
    elif probability < 0.6:
        return 'Moderate'
    else:
        return 'High'


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
