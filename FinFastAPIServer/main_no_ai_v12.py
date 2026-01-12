from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.encoders import jsonable_encoder
import math
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import logging
import re
from typing import Optional, Dict, Any, List, Tuple
import pandas as pd
import io
import json
from datetime import datetime
from FinancialTools import get_yearly_summary, get_monthly_summary, get_budget_variance, get_cash_flow

app = FastAPI(
    title="Financial Analysis API",
    version="2.0",
    description="RESTful API for financial data analysis"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def clean(obj):
    """Limpia valores NaN e Inf de objetos para serialización JSON"""
    if isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
        return None
    if isinstance(obj, dict):
        return {k: clean(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [clean(x) for x in obj]
    return obj


# ============================================================================
# MODELOS DE DATOS
# ============================================================================

class ColumnMapping(BaseModel):
    """Mapeo de columnas del CSV crudo a formato estándar"""
    date_column: Optional[str] = None  # Para datos transaccionales
    amount_column: Optional[str] = None  # Para datos transaccionales
    category_column: Optional[str] = None  # Para categorización
    concept_column: Optional[str] = None  # Para estados financieros
    budget_column: Optional[str] = None  # Para variaciones presupuestarias
    actual_column: Optional[str] = None  # Para variaciones presupuestarias
    debit_column: Optional[str] = None  # Para contabilidad debe-haber
    credit_column: Optional[str] = None  # Para contabilidad debe-haber


class NormalizationRules(BaseModel):
    """Reglas para normalización de datos"""
    unpivot: Optional[bool] = False  # Convertir columnas de años a filas
    unpivot_year_columns: Optional[List[str]] = []  # Columnas a despivotear (ej: ['a2020', 'a2021'])
    debe_haber: Optional[bool] = False  # Convertir debe/haber a importe con signo
    invert_negatives: Optional[bool] = False  # Invertir signos negativos
    detect_format: Optional[bool] = True  # Auto-detectar formato
    drop_empty_rows: Optional[bool] = True  # Eliminar filas vacías
    drop_empty_columns: Optional[bool] = True  # Eliminar columnas vacías


class NormalizeRequest(BaseModel):
    """Request para normalización de datos"""
    data: List[Dict[str, Any]]  # Datos crudos
    mapping: Optional[ColumnMapping] = ColumnMapping()
    rules: Optional[NormalizationRules] = NormalizationRules()


class AnalysisRequest(BaseModel):
    analysis_type: Optional[str] = "all"  # Por defecto ejecuta todos
    params: Optional[Dict[str, Any]] = {}


# ============================================================================
# MOTOR DE NORMALIZACIÓN
# ============================================================================

class DataNormalizer:
    """Motor de normalización de datos financieros"""
    
    @staticmethod
    def detect_format(df: pd.DataFrame) -> Tuple[str, float, List[str]]:
        """
        Detecta el formato del CSV y devuelve tipo, confianza y warnings.
        
        Returns:
            (format_type, confidence, warnings)
            format_type: 'financial_statement' | 'transactional' | 'budget' | 'unknown'
            confidence: 0.0 - 1.0
            warnings: Lista de mensajes
        """
        warnings = []
        confidence = 0.0
        cols_lower = [str(c).lower().strip() for c in df.columns]
        
        # Patrón para columnas de años
        year_pattern = re.compile(r'^a?\d{4}

class DataStore:
    """Gestión centralizada de datos en memoria"""
    def __init__(self):
        self.csvs = {}  # {session_id: {metadata, data}}
        self.analyses = {}  # {session_id: {analysis_type: result}}
    
    def store_csv(self, session_id: str, filename: str, data: List[Dict], metadata: Dict):
        self.csvs[session_id] = {
            "filename": filename,
            "data": data,
            "metadata": metadata,
            "uploaded_at": datetime.now().isoformat()
        }
    
    def get_csv(self, session_id: str) -> Optional[Dict]:
        return self.csvs.get(session_id)
    
    def delete_csv(self, session_id: str):
        if session_id in self.csvs:
            del self.csvs[session_id]
            if session_id in self.analyses:
                del self.analyses[session_id]
    
    def store_analysis(self, session_id: str, analysis_type: str, result: Dict):
        if session_id not in self.analyses:
            self.analyses[session_id] = {}
        self.analyses[session_id][analysis_type] = {
            "result": result,
            "generated_at": datetime.now().isoformat()
        }
    
    def get_analysis(self, session_id: str, analysis_type: str) -> Optional[Dict]:
        return self.analyses.get(session_id, {}).get(analysis_type)
    
    def list_sessions(self) -> List[str]:
        return list(self.csvs.keys())


store = DataStore()


# ============================================================================
# FUNCIÓN AUXILIAR PARA ANÁLISIS
# ============================================================================

def analyze_financial_data(csv_data, analysis_type="all", **params):
    """
    Ejecuta análisis financieros directamente.
    
    Args:
        csv_data: Datos en formato CSV (dict con key 'data')
        analysis_type: Tipo de análisis a ejecutar
            - "yearly_summary": Resumen anual
            - "monthly_summary": Resumen mensual
            - "budget_variance": Variaciones presupuestarias
            - "cash_flow": Flujo de caja
            - "all": Todos los análisis aplicables
        **params: Parámetros adicionales (ej: saldo_inicial para cash_flow)
    
    Returns:
        dict: Resultados del análisis solicitado
    """
    results = {}
    
    if analysis_type in ["yearly_summary", "all"]:
        try:
            result = json.loads(get_yearly_summary(csv_data))
            # Solo añadir si no hay error
            if "error" not in result:
                results["yearly_summary"] = result
            else:
                logger.warning(f"yearly_summary error: {result.get('error')}")
        except Exception as e:
            logger.error(f"yearly_summary exception: {str(e)}")
    
    if analysis_type in ["monthly_summary", "all"]:
        try:
            result = json.loads(get_monthly_summary(csv_data))
            if "error" not in result:
                results["monthly_summary"] = result
            else:
                logger.warning(f"monthly_summary error: {result.get('error')}")
        except Exception as e:
            logger.error(f"monthly_summary exception: {str(e)}")
    
    if analysis_type in ["budget_variance", "all"]:
        try:
            result = json.loads(get_budget_variance(csv_data))
            if "error" not in result:
                results["budget_variance"] = result
            else:
                logger.warning(f"budget_variance error: {result.get('error')}")
        except Exception as e:
            logger.error(f"budget_variance exception: {str(e)}")
    
    if analysis_type in ["cash_flow", "all"]:
        try:
            saldo_inicial = params.get("saldo_inicial", 0.0)
            result = json.loads(get_cash_flow(csv_data, saldo_inicial))
            if "error" not in result:
                results["cash_flow"] = result
            else:
                logger.warning(f"cash_flow error: {result.get('error')}")
        except Exception as e:
            logger.error(f"cash_flow exception: {str(e)}")
    
    # Si no hay resultados exitosos, lanzar error
    if not results:
        raise ValueError("No se pudo generar ningún análisis. Verifique el formato del CSV.")
    
    return results


# ============================================================================
# ENDPOINTS
# ============================================================================

@app.get("/")
def root():
    """API root - información general"""
    return {
        "name": "Financial Analysis API",
        "version": "2.0",
        "endpoints": {
            "normalize": "/api/normalize",
            "csvs": "/api/csvs",
            "analyses": "/api/analyses"
        }
    }


@app.post("/api/normalize")
async def normalize_data(request: NormalizeRequest):
    """
    POST /api/normalize - Normalizar datos crudos
    
    Body:
    {
        "data": [{...}, {...}],  // Datos crudos del Excel
        "mapping": {              // Opcional: mapeo de columnas
            "date_column": "fecha_transaccion",
            "amount_column": "monto",
            "category_column": "tipo",
            "concept_column": "descripcion",
            "debit_column": "debe",
            "credit_column": "haber"
        },
        "rules": {                // Opcional: reglas de transformación
            "unpivot": true,
            "unpivot_year_columns": ["a2020", "a2021", "a2022"],
            "debe_haber": true,
            "invert_negatives": false,
            "detect_format": true,
            "drop_empty_rows": true,
            "drop_empty_columns": true
        }
    }
    
    Response:
    {
        "normalized_data": [{...}, {...}],
        "format_detected": "transactional",
        "confidence": 0.95,
        "warnings": ["..."],
        "transformations_applied": ["..."],
        "columns": ["fecha", "importe", "categoria"],
        "rows": 120
    }
    """
    try:
        # Convertir Pydantic models a dicts
        mapping_dict = request.mapping.dict() if request.mapping else {}
        rules_dict = request.rules.dict() if request.rules else {}
        
        # Normalizar
        result = DataNormalizer.normalize(
            data=request.data,
            mapping=mapping_dict,
            rules=rules_dict
        )
        
        return clean(jsonable_encoder(result))
        
    except Exception as e:
        logger.exception("Error in normalization")
        raise HTTPException(status_code=500, detail=f"Normalization error: {str(e)}")


@app.get("/")
def root():
    """API root - información general"""
    return {
        "name": "Financial Analysis API",
        "version": "2.0",
        "endpoints": {
            "csvs": "/api/csvs",
            "analyses": "/api/analyses"
        }
    }


@app.get("/api/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "active_sessions": len(store.list_sessions())
    }


# ============================================================================
# RECURSO: /api/csvs (CRUD de CSVs)
# ============================================================================

@app.post("/api/csvs")
async def create_csv(file: UploadFile = File(...), session_id: str = "default"):
    """
    POST /api/csvs?session_id={sid} - Crear/subir un nuevo CSV
    """
    try:
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        df.columns = df.columns.str.strip().str.lower()
        
        data = df.to_dict('records')
        metadata = {
            "columns": list(df.columns),
            "rows": len(df),
            "size_bytes": len(contents)
        }
        
        store.store_csv(session_id, file.filename, data, metadata)
        
        return clean(jsonable_encoder({
            "session_id": session_id,
            "filename": file.filename,
            "metadata": metadata,
            "preview": data[:10],
            "message": "CSV uploaded successfully"
        }))
        
    except Exception as e:
        logger.exception("Error processing CSV")
        raise HTTPException(status_code=400, detail=f"Error processing CSV: {str(e)}")


@app.get("/api/csvs")
def list_csvs():
    """
    GET /api/csvs - Listar todos los CSVs
    """
    sessions = store.list_sessions()
    return {
        "csvs": [
            {
                "session_id": sid,
                "filename": store.get_csv(sid)["filename"],
                "uploaded_at": store.get_csv(sid)["uploaded_at"]
            }
            for sid in sessions
        ]
    }


@app.get("/api/csvs/{session_id}")
def get_csv(session_id: str, preview_only: bool = True):
    """
    GET /api/csvs/{session_id} - Obtener un CSV específico
    Query param: preview_only (default: true)
    """
    csv_data = store.get_csv(session_id)
    
    if not csv_data:
        raise HTTPException(status_code=404, detail="CSV not found")
    
    response = {
        "session_id": session_id,
        "filename": csv_data["filename"],
        "metadata": csv_data["metadata"],
        "uploaded_at": csv_data["uploaded_at"]
    }
    
    if preview_only:
        response["preview"] = csv_data["data"][:10]
    else:
        response["data"] = csv_data["data"]
    
    return clean(jsonable_encoder(response))


@app.delete("/api/csvs/{session_id}")
def delete_csv(session_id: str):
    """
    DELETE /api/csvs/{session_id} - Eliminar un CSV
    """
    csv_data = store.get_csv(session_id)
    
    if not csv_data:
        raise HTTPException(status_code=404, detail="CSV not found")
    
    store.delete_csv(session_id)
    
    return {
        "message": "CSV deleted successfully",
        "session_id": session_id
    }


# ============================================================================
# RECURSO: /api/analyses (CRUD de Análisis)
# ============================================================================

@app.post("/api/analyses")
async def create_analysis(session_id: str, request: AnalysisRequest = None):
    """
    POST /api/analyses?session_id={id} - Crear nuevo análisis
    Body (opcional): { "analysis_type": "yearly_summary", "params": {...} }
    
    Si no se proporciona body o analysis_type, ejecuta "all" por defecto
    """
    csv_data = store.get_csv(session_id)
    
    if not csv_data:
        raise HTTPException(status_code=404, detail="CSV not found. Upload a CSV first.")
    
    # Si no hay request o no tiene analysis_type, usar "all" por defecto
    if request is None or not hasattr(request, 'analysis_type') or not request.analysis_type:
        request = AnalysisRequest(analysis_type="all", params={})
    
    try:
        # Si es "all", ejecutar todos los análisis
        if request.analysis_type == "all":
            all_results = analyze_financial_data(
                csv_data={"data": csv_data["data"]},
                analysis_type="all",
                **request.params
            )
            
            # Guardar cada resultado individualmente
            for atype, result in all_results.items():
                store.store_analysis(session_id, atype, result)
            
            return clean(jsonable_encoder({
                "session_id": session_id,
                "analysis_type": "all",
                "result": all_results,
                "generated_at": datetime.now().isoformat()
            }))
        
        # Análisis específico
        result = analyze_financial_data(
            csv_data={"data": csv_data["data"]},
            analysis_type=request.analysis_type,
            **request.params
        )
        
        # Extraer el resultado específico del dict
        specific_result = result.get(request.analysis_type, result)
        
        # Guardar resultado
        store.store_analysis(session_id, request.analysis_type, specific_result)
        
        return clean(jsonable_encoder({
            "session_id": session_id,
            "analysis_type": request.analysis_type,
            "result": {request.analysis_type: specific_result},
            "generated_at": datetime.now().isoformat()
        }))
        
    except Exception as e:
        logger.exception("Error in analysis")
        raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")


@app.get("/api/analyses")
def list_analyses(session_id: str):
    """
    GET /api/analyses?session_id={id} - Listar análisis de una sesión
    """
    csv_data = store.get_csv(session_id)
    
    if not csv_data:
        raise HTTPException(status_code=404, detail="CSV not found")
    
    analyses = store.analyses.get(session_id, {})
    
    return {
        "session_id": session_id,
        "analyses": [
            {
                "analysis_type": atype,
                "generated_at": adata["generated_at"]
            }
            for atype, adata in analyses.items()
        ]
    }


@app.get("/api/analyses/{analysis_type}")
def get_analysis(session_id: str, analysis_type: str):
    """
    GET /api/analyses/{type}?session_id={id} - Obtener análisis
    
    Si analysis_type == "all": Retorna todos los análisis como dict con claves
    Si analysis_type específico: Retorna ese análisis envuelto con su clave
    
    Ejemplos:
    - GET /api/analyses/all?session_id=abc → {yearly_summary: {...}, monthly_summary: {...}, ...}
    - GET /api/analyses/cash_flow?session_id=abc → {cash_flow: {...}}
    """
    csv_data = store.get_csv(session_id)
    
    if not csv_data:
        raise HTTPException(status_code=404, detail="CSV not found")
    
    # Caso especial: "all" devuelve todos los análisis
    if analysis_type == "all":
        analyses = store.analyses.get(session_id, {})
        
        if not analyses:
            raise HTTPException(
                status_code=404, 
                detail="No analyses found. Run POST /api/analyses first."
            )
        
        # Construir objeto con todos los análisis
        all_results = {}
        for atype, adata in analyses.items():
            all_results[atype] = adata["result"].get(atype, adata["result"])
        
        return clean(jsonable_encoder(all_results))
    
    # Caso específico: devolver un análisis con su clave
    result = store.get_analysis(session_id, analysis_type)
    
    if not result:
        raise HTTPException(
            status_code=404, 
            detail=f"Analysis '{analysis_type}' not found. Run POST /api/analyses first."
        )
    
    # Retornar envuelto con su clave
    return clean(jsonable_encoder({
        analysis_type: result["result"].get(analysis_type, result["result"])
    }))


# ============================================================================
# RECURSO: /api/tools (Metadatos)
# ============================================================================

@app.get("/api/tools")
def list_tools():
    """
    GET /api/tools - Lista herramientas disponibles y sus parámetros
    """
    return {
        "tools": [
            {
                "name": "yearly_summary",
                "description": "Análisis de estados financieros anuales",
                "input_format": "financial_statement",
                "required_columns": ["concepto", "a2020", "a2021", "..."],
                "parameters": {}
            },
            {
                "name": "monthly_summary",
                "description": "Resumen mensual desde datos transaccionales",
                "input_format": "transactional",
                "required_columns": ["fecha", "importe"],
                "parameters": {}
            },
            {
                "name": "budget_variance",
                "description": "Análisis de desviaciones presupuestarias",
                "input_format": "budget",
                "required_columns": ["categoria", "presupuesto", "real"],
                "parameters": {}
            },
            {
                "name": "cash_flow",
                "description": "Análisis de flujo de caja",
                "input_format": "transactional",
                "required_columns": ["fecha", "importe"],
                "parameters": {
                    "saldo_inicial": {
                        "type": "number",
                        "default": 0.0,
                        "description": "Saldo de caja inicial"
                    }
                }
            }
        ]
    }


@app.get("/api/examples")
def get_examples():
    """
    GET /api/examples - Datos de ejemplo para testing
    """
    return {
        "yearly_summary": {
            "year": 2025,
            "total_income": 15000,
            "total_expenses": 5000,
            "net_result": 10000,
            "currency": "EUR"
        },
        "monthly_summary": {
            "months": [
                {
                    "month": "2025-01",
                    "income": 10000,
                    "expenses": 3000,
                    "net": 7000
                },
                {
                    "month": "2025-02",
                    "income": 5000,
                    "expenses": 2000,
                    "net": 3000
                }
            ],
            "totals": {
                "income": 15000,
                "expenses": 5000,
                "net": 10000
            }
        },
        "budget_variance": {
            "by_category": [
                {
                    "category": "Marketing",
                    "budgeted": 2000,
                    "actual": 2500,
                    "variance": 500,
                    "variance_pct": 25.0
                },
                {
                    "category": "Operaciones",
                    "budgeted": 3000,
                    "actual": 2500,
                    "variance": -500,
                    "variance_pct": -16.7
                }
            ],
            "total_variance": 0
        },
        "cash_flow": {
            "initial_balance": 1000,
            "periods": [
                {
                    "date": "2025-01-31",
                    "inflow": 10000,
                    "outflow": 3000,
                    "net_flow": 7000,
                    "ending_balance": 8000
                },
                {
                    "date": "2025-02-28",
                    "inflow": 5000,
                    "outflow": 2000,
                    "net_flow": 3000,
                    "ending_balance": 11000
                }
            ],
            "final_balance": 11000
        }
    }


# Para correr: uvicorn main:app --reload --port 8000)
        year_cols = [c for c in cols_lower if year_pattern.match(c)]
        
        # Detectores
        has_concept = any(term in ' '.join(cols_lower) for term in ['concepto', 'nombre', 'concept', 'name'])
        has_date = any(term in ' '.join(cols_lower) for term in ['fecha', 'date'])
        has_amount = any(term in ' '.join(cols_lower) for term in ['importe', 'monto', 'amount', 'cantidad'])
        has_category = any(term in ' '.join(cols_lower) for term in ['categoria', 'category', 'tipo', 'type'])
        has_budget = any(term in ' '.join(cols_lower) for term in ['presupuesto', 'budget', 'planeado'])
        has_actual = any(term in ' '.join(cols_lower) for term in ['real', 'actual', 'ejecutado'])
        has_debit = any(term in ' '.join(cols_lower) for term in ['debe', 'debit'])
        has_credit = any(term in ' '.join(cols_lower) for term in ['haber', 'credit'])
        
        # Estados financieros (años en columnas)
        if len(year_cols) >= 2 and has_concept:
            confidence = 0.9
            if len(year_cols) < 3:
                warnings.append("Solo se detectaron 2 años, se recomienda al menos 3 para análisis de tendencias")
            return 'financial_statement', confidence, warnings
        
        # Presupuesto vs Real
        if has_budget and has_actual and (has_category or has_concept):
            confidence = 0.95
            return 'budget', confidence, warnings
        
        # Transaccional (fecha + importe)
        if has_date and has_amount:
            confidence = 0.85
            if not has_category:
                warnings.append("No se detectó columna de categoría, los análisis serán limitados")
            return 'transactional', confidence, warnings
        
        # Contabilidad (debe/haber)
        if has_debit and has_credit:
            confidence = 0.8
            warnings.append("Formato debe/haber detectado, se convertirá a importe con signo")
            return 'transactional', confidence, warnings
        
        # Desconocido
        warnings.append("No se pudo determinar el formato automáticamente")
        return 'unknown', 0.0, warnings
    
    @staticmethod
    def clean_numeric(value) -> float:
        """Limpia y convierte valores numéricos"""
        if pd.isna(value) or value == '':
            return 0.0
        
        str_value = str(value).strip()
        str_value = re.sub(r'[€$£\s]', '', str_value)
        
        # Formato europeo vs americano
        if ',' in str_value and '.' in str_value:
            last_comma = str_value.rfind(',')
            last_dot = str_value.rfind('.')
            if last_comma > last_dot:
                str_value = str_value.replace('.', '').replace(',', '.')
            else:
                str_value = str_value.replace(',', '')
        elif ',' in str_value:
            if str_value.rfind(',') > len(str_value) - 4:
                str_value = str_value.replace(',', '.')
            else:
                str_value = str_value.replace(',', '')
        
        try:
            return float(str_value)
        except:
            return 0.0
    
    @staticmethod
    def unpivot_years(df: pd.DataFrame, concept_col: str, year_cols: List[str]) -> pd.DataFrame:
        """
        Convierte formato ancho (años en columnas) a formato largo.
        
        Concepto | a2020 | a2021  →  Concepto | Año | Importe
        """
        # Identificar columnas que no son años
        id_cols = [c for c in df.columns if c not in year_cols]
        
        # Melt (unpivot)
        df_melted = df.melt(
            id_vars=id_cols,
            value_vars=year_cols,
            var_name='año',
            value_name='importe'
        )
        
        # Limpiar años (quitar 'a' si existe)
        df_melted['año'] = df_melted['año'].str.replace('a', '', regex=False)
        
        # Limpiar importes
        df_melted['importe'] = df_melted['importe'].apply(DataNormalizer.clean_numeric)
        
        return df_melted
    
    @staticmethod
    def apply_debe_haber(df: pd.DataFrame, debit_col: str, credit_col: str) -> pd.DataFrame:
        """
        Convierte debe/haber a importe con signo.
        
        Debe | Haber  →  Importe
        100  | 0      →  100
        0    | 50     →  -50
        """
        df = df.copy()
        df['debe_clean'] = df[debit_col].apply(DataNormalizer.clean_numeric)
        df['haber_clean'] = df[credit_col].apply(DataNormalizer.clean_numeric)
        df['importe'] = df['debe_clean'] - df['haber_clean']
        df = df.drop(columns=['debe_clean', 'haber_clean', debit_col, credit_col])
        return df
    
    @staticmethod
    def normalize(
        data: List[Dict],
        mapping: Dict[str, str] = None,
        rules: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Normaliza datos crudos según mapeo y reglas.
        
        Args:
            data: Datos crudos
            mapping: Mapeo de columnas (date_column, amount_column, etc.)
            rules: Reglas de transformación (unpivot, debe_haber, etc.)
        
        Returns:
            {
                'normalized_data': [...],
                'format_detected': 'transactional',
                'confidence': 0.95,
                'warnings': [...],
                'transformations_applied': [...]
            }
        """
        if mapping is None:
            mapping = {}
        if rules is None:
            rules = {}
        
        # Convertir a DataFrame
        df = pd.DataFrame(data)
        df.columns = df.columns.str.strip().str.lower()
        
        warnings = []
        transformations = []
        confidence = 0.0
        
        # 1. Limpiar filas/columnas vacías
        if rules.get('drop_empty_rows', True):
            initial_rows = len(df)
            df = df.dropna(how='all')
            dropped = initial_rows - len(df)
            if dropped > 0:
                transformations.append(f"Eliminadas {dropped} filas vacías")
        
        if rules.get('drop_empty_columns', True):
            initial_cols = len(df.columns)
            df = df.dropna(axis=1, how='all')
            dropped = initial_cols - len(df.columns)
            if dropped > 0:
                transformations.append(f"Eliminadas {dropped} columnas vacías")
        
        # 2. Auto-detectar formato si está habilitado
        format_detected = 'unknown'
        if rules.get('detect_format', True):
            format_detected, confidence, detect_warnings = DataNormalizer.detect_format(df)
            warnings.extend(detect_warnings)
            transformations.append(f"Formato detectado: {format_detected} (confianza: {confidence:.0%})")
        
        # 3. Aplicar debe/haber si está en reglas
        if rules.get('debe_haber', False):
            debit_col = mapping.get('debit_column')
            credit_col = mapping.get('credit_column')
            
            if debit_col and credit_col and debit_col in df.columns and credit_col in df.columns:
                df = DataNormalizer.apply_debe_haber(df, debit_col, credit_col)
                transformations.append(f"Convertido debe/haber a importe: {debit_col} - {credit_col}")
            else:
                warnings.append("Debe/haber solicitado pero columnas no encontradas")
        
        # 4. Aplicar unpivot si está en reglas
        if rules.get('unpivot', False):
            year_cols = rules.get('unpivot_year_columns', [])
            concept_col = mapping.get('concept_column')
            
            if not year_cols:
                # Auto-detectar columnas de años
                year_pattern = re.compile(r'^a?\d{4}

class DataStore:
    """Gestión centralizada de datos en memoria"""
    def __init__(self):
        self.csvs = {}  # {session_id: {metadata, data}}
        self.analyses = {}  # {session_id: {analysis_type: result}}
    
    def store_csv(self, session_id: str, filename: str, data: List[Dict], metadata: Dict):
        self.csvs[session_id] = {
            "filename": filename,
            "data": data,
            "metadata": metadata,
            "uploaded_at": datetime.now().isoformat()
        }
    
    def get_csv(self, session_id: str) -> Optional[Dict]:
        return self.csvs.get(session_id)
    
    def delete_csv(self, session_id: str):
        if session_id in self.csvs:
            del self.csvs[session_id]
            if session_id in self.analyses:
                del self.analyses[session_id]
    
    def store_analysis(self, session_id: str, analysis_type: str, result: Dict):
        if session_id not in self.analyses:
            self.analyses[session_id] = {}
        self.analyses[session_id][analysis_type] = {
            "result": result,
            "generated_at": datetime.now().isoformat()
        }
    
    def get_analysis(self, session_id: str, analysis_type: str) -> Optional[Dict]:
        return self.analyses.get(session_id, {}).get(analysis_type)
    
    def list_sessions(self) -> List[str]:
        return list(self.csvs.keys())


store = DataStore()


# ============================================================================
# FUNCIÓN AUXILIAR PARA ANÁLISIS
# ============================================================================

def analyze_financial_data(csv_data, analysis_type="all", **params):
    """
    Ejecuta análisis financieros directamente.
    
    Args:
        csv_data: Datos en formato CSV (dict con key 'data')
        analysis_type: Tipo de análisis a ejecutar
            - "yearly_summary": Resumen anual
            - "monthly_summary": Resumen mensual
            - "budget_variance": Variaciones presupuestarias
            - "cash_flow": Flujo de caja
            - "all": Todos los análisis aplicables
        **params: Parámetros adicionales (ej: saldo_inicial para cash_flow)
    
    Returns:
        dict: Resultados del análisis solicitado
    """
    results = {}
    
    if analysis_type in ["yearly_summary", "all"]:
        try:
            result = json.loads(get_yearly_summary(csv_data))
            # Solo añadir si no hay error
            if "error" not in result:
                results["yearly_summary"] = result
            else:
                logger.warning(f"yearly_summary error: {result.get('error')}")
        except Exception as e:
            logger.error(f"yearly_summary exception: {str(e)}")
    
    if analysis_type in ["monthly_summary", "all"]:
        try:
            result = json.loads(get_monthly_summary(csv_data))
            if "error" not in result:
                results["monthly_summary"] = result
            else:
                logger.warning(f"monthly_summary error: {result.get('error')}")
        except Exception as e:
            logger.error(f"monthly_summary exception: {str(e)}")
    
    if analysis_type in ["budget_variance", "all"]:
        try:
            result = json.loads(get_budget_variance(csv_data))
            if "error" not in result:
                results["budget_variance"] = result
            else:
                logger.warning(f"budget_variance error: {result.get('error')}")
        except Exception as e:
            logger.error(f"budget_variance exception: {str(e)}")
    
    if analysis_type in ["cash_flow", "all"]:
        try:
            saldo_inicial = params.get("saldo_inicial", 0.0)
            result = json.loads(get_cash_flow(csv_data, saldo_inicial))
            if "error" not in result:
                results["cash_flow"] = result
            else:
                logger.warning(f"cash_flow error: {result.get('error')}")
        except Exception as e:
            logger.error(f"cash_flow exception: {str(e)}")
    
    # Si no hay resultados exitosos, lanzar error
    if not results:
        raise ValueError("No se pudo generar ningún análisis. Verifique el formato del CSV.")
    
    return results


# ============================================================================
# ENDPOINTS
# ============================================================================

@app.get("/")
def root():
    """API root - información general"""
    return {
        "name": "Financial Analysis API",
        "version": "2.0",
        "endpoints": {
            "csvs": "/api/csvs",
            "analyses": "/api/analyses"
        }
    }


@app.get("/api/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "active_sessions": len(store.list_sessions())
    }


# ============================================================================
# RECURSO: /api/csvs (CRUD de CSVs)
# ============================================================================

@app.post("/api/csvs")
async def create_csv(file: UploadFile = File(...), session_id: str = "default"):
    """
    POST /api/csvs?session_id={sid} - Crear/subir un nuevo CSV
    """
    try:
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        df.columns = df.columns.str.strip().str.lower()
        
        data = df.to_dict('records')
        metadata = {
            "columns": list(df.columns),
            "rows": len(df),
            "size_bytes": len(contents)
        }
        
        store.store_csv(session_id, file.filename, data, metadata)
        
        return clean(jsonable_encoder({
            "session_id": session_id,
            "filename": file.filename,
            "metadata": metadata,
            "preview": data[:10],
            "message": "CSV uploaded successfully"
        }))
        
    except Exception as e:
        logger.exception("Error processing CSV")
        raise HTTPException(status_code=400, detail=f"Error processing CSV: {str(e)}")


@app.get("/api/csvs")
def list_csvs():
    """
    GET /api/csvs - Listar todos los CSVs
    """
    sessions = store.list_sessions()
    return {
        "csvs": [
            {
                "session_id": sid,
                "filename": store.get_csv(sid)["filename"],
                "uploaded_at": store.get_csv(sid)["uploaded_at"]
            }
            for sid in sessions
        ]
    }


@app.get("/api/csvs/{session_id}")
def get_csv(session_id: str, preview_only: bool = True):
    """
    GET /api/csvs/{session_id} - Obtener un CSV específico
    Query param: preview_only (default: true)
    """
    csv_data = store.get_csv(session_id)
    
    if not csv_data:
        raise HTTPException(status_code=404, detail="CSV not found")
    
    response = {
        "session_id": session_id,
        "filename": csv_data["filename"],
        "metadata": csv_data["metadata"],
        "uploaded_at": csv_data["uploaded_at"]
    }
    
    if preview_only:
        response["preview"] = csv_data["data"][:10]
    else:
        response["data"] = csv_data["data"]
    
    return clean(jsonable_encoder(response))


@app.delete("/api/csvs/{session_id}")
def delete_csv(session_id: str):
    """
    DELETE /api/csvs/{session_id} - Eliminar un CSV
    """
    csv_data = store.get_csv(session_id)
    
    if not csv_data:
        raise HTTPException(status_code=404, detail="CSV not found")
    
    store.delete_csv(session_id)
    
    return {
        "message": "CSV deleted successfully",
        "session_id": session_id
    }


# ============================================================================
# RECURSO: /api/analyses (CRUD de Análisis)
# ============================================================================

@app.post("/api/analyses")
async def create_analysis(session_id: str, request: AnalysisRequest = None):
    """
    POST /api/analyses?session_id={id} - Crear nuevo análisis
    Body (opcional): { "analysis_type": "yearly_summary", "params": {...} }
    
    Si no se proporciona body o analysis_type, ejecuta "all" por defecto
    """
    csv_data = store.get_csv(session_id)
    
    if not csv_data:
        raise HTTPException(status_code=404, detail="CSV not found. Upload a CSV first.")
    
    # Si no hay request o no tiene analysis_type, usar "all" por defecto
    if request is None or not hasattr(request, 'analysis_type') or not request.analysis_type:
        request = AnalysisRequest(analysis_type="all", params={})
    
    try:
        # Si es "all", ejecutar todos los análisis
        if request.analysis_type == "all":
            all_results = analyze_financial_data(
                csv_data={"data": csv_data["data"]},
                analysis_type="all",
                **request.params
            )
            
            # Guardar cada resultado individualmente
            for atype, result in all_results.items():
                store.store_analysis(session_id, atype, result)
            
            return clean(jsonable_encoder({
                "session_id": session_id,
                "analysis_type": "all",
                "result": all_results,
                "generated_at": datetime.now().isoformat()
            }))
        
        # Análisis específico
        result = analyze_financial_data(
            csv_data={"data": csv_data["data"]},
            analysis_type=request.analysis_type,
            **request.params
        )
        
        # Extraer el resultado específico del dict
        specific_result = result.get(request.analysis_type, result)
        
        # Guardar resultado
        store.store_analysis(session_id, request.analysis_type, specific_result)
        
        return clean(jsonable_encoder({
            "session_id": session_id,
            "analysis_type": request.analysis_type,
            "result": {request.analysis_type: specific_result},
            "generated_at": datetime.now().isoformat()
        }))
        
    except Exception as e:
        logger.exception("Error in analysis")
        raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")


@app.get("/api/analyses")
def list_analyses(session_id: str):
    """
    GET /api/analyses?session_id={id} - Listar análisis de una sesión
    """
    csv_data = store.get_csv(session_id)
    
    if not csv_data:
        raise HTTPException(status_code=404, detail="CSV not found")
    
    analyses = store.analyses.get(session_id, {})
    
    return {
        "session_id": session_id,
        "analyses": [
            {
                "analysis_type": atype,
                "generated_at": adata["generated_at"]
            }
            for atype, adata in analyses.items()
        ]
    }


@app.get("/api/analyses/{analysis_type}")
def get_analysis(session_id: str, analysis_type: str):
    """
    GET /api/analyses/{type}?session_id={id} - Obtener análisis
    
    Si analysis_type == "all": Retorna todos los análisis como dict con claves
    Si analysis_type específico: Retorna ese análisis envuelto con su clave
    
    Ejemplos:
    - GET /api/analyses/all?session_id=abc → {yearly_summary: {...}, monthly_summary: {...}, ...}
    - GET /api/analyses/cash_flow?session_id=abc → {cash_flow: {...}}
    """
    csv_data = store.get_csv(session_id)
    
    if not csv_data:
        raise HTTPException(status_code=404, detail="CSV not found")
    
    # Caso especial: "all" devuelve todos los análisis
    if analysis_type == "all":
        analyses = store.analyses.get(session_id, {})
        
        if not analyses:
            raise HTTPException(
                status_code=404, 
                detail="No analyses found. Run POST /api/analyses first."
            )
        
        # Construir objeto con todos los análisis
        all_results = {}
        for atype, adata in analyses.items():
            all_results[atype] = adata["result"].get(atype, adata["result"])
        
        return clean(jsonable_encoder(all_results))
    
    # Caso específico: devolver un análisis con su clave
    result = store.get_analysis(session_id, analysis_type)
    
    if not result:
        raise HTTPException(
            status_code=404, 
            detail=f"Analysis '{analysis_type}' not found. Run POST /api/analyses first."
        )
    
    # Retornar envuelto con su clave
    return clean(jsonable_encoder({
        analysis_type: result["result"].get(analysis_type, result["result"])
    }))


# ============================================================================
# RECURSO: /api/tools (Metadatos)
# ============================================================================

@app.get("/api/tools")
def list_tools():
    """
    GET /api/tools - Lista herramientas disponibles y sus parámetros
    """
    return {
        "tools": [
            {
                "name": "yearly_summary",
                "description": "Análisis de estados financieros anuales",
                "input_format": "financial_statement",
                "required_columns": ["concepto", "a2020", "a2021", "..."],
                "parameters": {}
            },
            {
                "name": "monthly_summary",
                "description": "Resumen mensual desde datos transaccionales",
                "input_format": "transactional",
                "required_columns": ["fecha", "importe"],
                "parameters": {}
            },
            {
                "name": "budget_variance",
                "description": "Análisis de desviaciones presupuestarias",
                "input_format": "budget",
                "required_columns": ["categoria", "presupuesto", "real"],
                "parameters": {}
            },
            {
                "name": "cash_flow",
                "description": "Análisis de flujo de caja",
                "input_format": "transactional",
                "required_columns": ["fecha", "importe"],
                "parameters": {
                    "saldo_inicial": {
                        "type": "number",
                        "default": 0.0,
                        "description": "Saldo de caja inicial"
                    }
                }
            }
        ]
    }


@app.get("/api/examples")
def get_examples():
    """
    GET /api/examples - Datos de ejemplo para testing
    """
    return {
        "yearly_summary": {
            "year": 2025,
            "total_income": 15000,
            "total_expenses": 5000,
            "net_result": 10000,
            "currency": "EUR"
        },
        "monthly_summary": {
            "months": [
                {
                    "month": "2025-01",
                    "income": 10000,
                    "expenses": 3000,
                    "net": 7000
                },
                {
                    "month": "2025-02",
                    "income": 5000,
                    "expenses": 2000,
                    "net": 3000
                }
            ],
            "totals": {
                "income": 15000,
                "expenses": 5000,
                "net": 10000
            }
        },
        "budget_variance": {
            "by_category": [
                {
                    "category": "Marketing",
                    "budgeted": 2000,
                    "actual": 2500,
                    "variance": 500,
                    "variance_pct": 25.0
                },
                {
                    "category": "Operaciones",
                    "budgeted": 3000,
                    "actual": 2500,
                    "variance": -500,
                    "variance_pct": -16.7
                }
            ],
            "total_variance": 0
        },
        "cash_flow": {
            "initial_balance": 1000,
            "periods": [
                {
                    "date": "2025-01-31",
                    "inflow": 10000,
                    "outflow": 3000,
                    "net_flow": 7000,
                    "ending_balance": 8000
                },
                {
                    "date": "2025-02-28",
                    "inflow": 5000,
                    "outflow": 2000,
                    "net_flow": 3000,
                    "ending_balance": 11000
                }
            ],
            "final_balance": 11000
        }
    }


# Para correr: uvicorn main:app --reload --port 8000)
                year_cols = [c for c in df.columns if year_pattern.match(str(c))]
            
            if year_cols and concept_col and concept_col in df.columns:
                df = DataNormalizer.unpivot_years(df, concept_col, year_cols)
                transformations.append(f"Unpivot aplicado: {len(year_cols)} años → formato largo")
                format_detected = 'transactional'
            elif year_cols and not concept_col:
                # Intentar encontrar columna de concepto
                for col in df.columns:
                    if any(term in col for term in ['concepto', 'nombre', 'concept', 'name']):
                        df = DataNormalizer.unpivot_years(df, col, year_cols)
                        transformations.append(f"Unpivot aplicado (auto-detectado concepto: {col})")
                        format_detected = 'transactional'
                        break
                else:
                    warnings.append("Unpivot solicitado pero no se encontró columna de concepto")
        
        # 5. Invertir negativos si está en reglas
        if rules.get('invert_negatives', False):
            amount_col = mapping.get('amount_column', 'importe')
            if amount_col in df.columns:
                df[amount_col] = df[amount_col].apply(lambda x: -x if isinstance(x, (int, float)) else x)
                transformations.append("Signos invertidos en columna de importe")
        
        # 6. Normalizar nombres de columnas según mapeo
        rename_map = {}
        if mapping.get('date_column') and mapping['date_column'] in df.columns:
            rename_map[mapping['date_column']] = 'fecha'
        if mapping.get('amount_column') and mapping['amount_column'] in df.columns:
            rename_map[mapping['amount_column']] = 'importe'
        if mapping.get('category_column') and mapping['category_column'] in df.columns:
            rename_map[mapping['category_column']] = 'categoria'
        if mapping.get('concept_column') and mapping['concept_column'] in df.columns:
            rename_map[mapping['concept_column']] = 'concepto'
        
        if rename_map:
            df = df.rename(columns=rename_map)
            transformations.append(f"Columnas renombradas: {list(rename_map.keys())}")
        
        # 7. Validación final
        if format_detected == 'transactional':
            if 'fecha' not in df.columns:
                warnings.append("ADVERTENCIA: Formato transaccional pero sin columna 'fecha'")
                confidence *= 0.7
            if 'importe' not in df.columns:
                warnings.append("ADVERTENCIA: Formato transaccional pero sin columna 'importe'")
                confidence *= 0.7
        
        if format_detected == 'financial_statement':
            if 'concepto' not in df.columns:
                warnings.append("ADVERTENCIA: Estado financiero pero sin columna 'concepto'")
                confidence *= 0.8
        
        # Convertir de vuelta a lista de dicts
        normalized_data = df.to_dict('records')
        
        return {
            'normalized_data': normalized_data,
            'format_detected': format_detected,
            'confidence': round(confidence, 2),
            'warnings': warnings,
            'transformations_applied': transformations,
            'columns': list(df.columns),
            'rows': len(df)
        }


# ============================================================================
# ALMACENAMIENTO EN MEMORIA
# ============================================================================

class DataStore:
    """Gestión centralizada de datos en memoria"""
    def __init__(self):
        self.csvs = {}  # {session_id: {metadata, data}}
        self.analyses = {}  # {session_id: {analysis_type: result}}
    
    def store_csv(self, session_id: str, filename: str, data: List[Dict], metadata: Dict):
        self.csvs[session_id] = {
            "filename": filename,
            "data": data,
            "metadata": metadata,
            "uploaded_at": datetime.now().isoformat()
        }
    
    def get_csv(self, session_id: str) -> Optional[Dict]:
        return self.csvs.get(session_id)
    
    def delete_csv(self, session_id: str):
        if session_id in self.csvs:
            del self.csvs[session_id]
            if session_id in self.analyses:
                del self.analyses[session_id]
    
    def store_analysis(self, session_id: str, analysis_type: str, result: Dict):
        if session_id not in self.analyses:
            self.analyses[session_id] = {}
        self.analyses[session_id][analysis_type] = {
            "result": result,
            "generated_at": datetime.now().isoformat()
        }
    
    def get_analysis(self, session_id: str, analysis_type: str) -> Optional[Dict]:
        return self.analyses.get(session_id, {}).get(analysis_type)
    
    def list_sessions(self) -> List[str]:
        return list(self.csvs.keys())


store = DataStore()


# ============================================================================
# FUNCIÓN AUXILIAR PARA ANÁLISIS
# ============================================================================

def analyze_financial_data(csv_data, analysis_type="all", **params):
    """
    Ejecuta análisis financieros directamente.
    
    Args:
        csv_data: Datos en formato CSV (dict con key 'data')
        analysis_type: Tipo de análisis a ejecutar
            - "yearly_summary": Resumen anual
            - "monthly_summary": Resumen mensual
            - "budget_variance": Variaciones presupuestarias
            - "cash_flow": Flujo de caja
            - "all": Todos los análisis aplicables
        **params: Parámetros adicionales (ej: saldo_inicial para cash_flow)
    
    Returns:
        dict: Resultados del análisis solicitado
    """
    results = {}
    
    if analysis_type in ["yearly_summary", "all"]:
        try:
            result = json.loads(get_yearly_summary(csv_data))
            # Solo añadir si no hay error
            if "error" not in result:
                results["yearly_summary"] = result
            else:
                logger.warning(f"yearly_summary error: {result.get('error')}")
        except Exception as e:
            logger.error(f"yearly_summary exception: {str(e)}")
    
    if analysis_type in ["monthly_summary", "all"]:
        try:
            result = json.loads(get_monthly_summary(csv_data))
            if "error" not in result:
                results["monthly_summary"] = result
            else:
                logger.warning(f"monthly_summary error: {result.get('error')}")
        except Exception as e:
            logger.error(f"monthly_summary exception: {str(e)}")
    
    if analysis_type in ["budget_variance", "all"]:
        try:
            result = json.loads(get_budget_variance(csv_data))
            if "error" not in result:
                results["budget_variance"] = result
            else:
                logger.warning(f"budget_variance error: {result.get('error')}")
        except Exception as e:
            logger.error(f"budget_variance exception: {str(e)}")
    
    if analysis_type in ["cash_flow", "all"]:
        try:
            saldo_inicial = params.get("saldo_inicial", 0.0)
            result = json.loads(get_cash_flow(csv_data, saldo_inicial))
            if "error" not in result:
                results["cash_flow"] = result
            else:
                logger.warning(f"cash_flow error: {result.get('error')}")
        except Exception as e:
            logger.error(f"cash_flow exception: {str(e)}")
    
    # Si no hay resultados exitosos, lanzar error
    if not results:
        raise ValueError("No se pudo generar ningún análisis. Verifique el formato del CSV.")
    
    return results


# ============================================================================
# ENDPOINTS
# ============================================================================

@app.get("/")
def root():
    """API root - información general"""
    return {
        "name": "Financial Analysis API",
        "version": "2.0",
        "endpoints": {
            "csvs": "/api/csvs",
            "analyses": "/api/analyses"
        }
    }


@app.get("/api/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "active_sessions": len(store.list_sessions())
    }


# ============================================================================
# RECURSO: /api/csvs (CRUD de CSVs)
# ============================================================================

@app.post("/api/csvs")
async def create_csv(file: UploadFile = File(...), session_id: str = "default"):
    """
    POST /api/csvs?session_id={sid} - Crear/subir un nuevo CSV
    """
    try:
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        df.columns = df.columns.str.strip().str.lower()
        
        data = df.to_dict('records')
        metadata = {
            "columns": list(df.columns),
            "rows": len(df),
            "size_bytes": len(contents)
        }
        
        store.store_csv(session_id, file.filename, data, metadata)
        
        return clean(jsonable_encoder({
            "session_id": session_id,
            "filename": file.filename,
            "metadata": metadata,
            "preview": data[:10],
            "message": "CSV uploaded successfully"
        }))
        
    except Exception as e:
        logger.exception("Error processing CSV")
        raise HTTPException(status_code=400, detail=f"Error processing CSV: {str(e)}")


@app.get("/api/csvs")
def list_csvs():
    """
    GET /api/csvs - Listar todos los CSVs
    """
    sessions = store.list_sessions()
    return {
        "csvs": [
            {
                "session_id": sid,
                "filename": store.get_csv(sid)["filename"],
                "uploaded_at": store.get_csv(sid)["uploaded_at"]
            }
            for sid in sessions
        ]
    }


@app.get("/api/csvs/{session_id}")
def get_csv(session_id: str, preview_only: bool = True):
    """
    GET /api/csvs/{session_id} - Obtener un CSV específico
    Query param: preview_only (default: true)
    """
    csv_data = store.get_csv(session_id)
    
    if not csv_data:
        raise HTTPException(status_code=404, detail="CSV not found")
    
    response = {
        "session_id": session_id,
        "filename": csv_data["filename"],
        "metadata": csv_data["metadata"],
        "uploaded_at": csv_data["uploaded_at"]
    }
    
    if preview_only:
        response["preview"] = csv_data["data"][:10]
    else:
        response["data"] = csv_data["data"]
    
    return clean(jsonable_encoder(response))


@app.delete("/api/csvs/{session_id}")
def delete_csv(session_id: str):
    """
    DELETE /api/csvs/{session_id} - Eliminar un CSV
    """
    csv_data = store.get_csv(session_id)
    
    if not csv_data:
        raise HTTPException(status_code=404, detail="CSV not found")
    
    store.delete_csv(session_id)
    
    return {
        "message": "CSV deleted successfully",
        "session_id": session_id
    }


# ============================================================================
# RECURSO: /api/analyses (CRUD de Análisis)
# ============================================================================

@app.post("/api/analyses")
async def create_analysis(session_id: str, request: AnalysisRequest = None):
    """
    POST /api/analyses?session_id={id} - Crear nuevo análisis
    Body (opcional): { "analysis_type": "yearly_summary", "params": {...} }
    
    Si no se proporciona body o analysis_type, ejecuta "all" por defecto
    """
    csv_data = store.get_csv(session_id)
    
    if not csv_data:
        raise HTTPException(status_code=404, detail="CSV not found. Upload a CSV first.")
    
    # Si no hay request o no tiene analysis_type, usar "all" por defecto
    if request is None or not hasattr(request, 'analysis_type') or not request.analysis_type:
        request = AnalysisRequest(analysis_type="all", params={})
    
    try:
        # Si es "all", ejecutar todos los análisis
        if request.analysis_type == "all":
            all_results = analyze_financial_data(
                csv_data={"data": csv_data["data"]},
                analysis_type="all",
                **request.params
            )
            
            # Guardar cada resultado individualmente
            for atype, result in all_results.items():
                store.store_analysis(session_id, atype, result)
            
            return clean(jsonable_encoder({
                "session_id": session_id,
                "analysis_type": "all",
                "result": all_results,
                "generated_at": datetime.now().isoformat()
            }))
        
        # Análisis específico
        result = analyze_financial_data(
            csv_data={"data": csv_data["data"]},
            analysis_type=request.analysis_type,
            **request.params
        )
        
        # Extraer el resultado específico del dict
        specific_result = result.get(request.analysis_type, result)
        
        # Guardar resultado
        store.store_analysis(session_id, request.analysis_type, specific_result)
        
        return clean(jsonable_encoder({
            "session_id": session_id,
            "analysis_type": request.analysis_type,
            "result": {request.analysis_type: specific_result},
            "generated_at": datetime.now().isoformat()
        }))
        
    except Exception as e:
        logger.exception("Error in analysis")
        raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")


@app.get("/api/analyses")
def list_analyses(session_id: str):
    """
    GET /api/analyses?session_id={id} - Listar análisis de una sesión
    """
    csv_data = store.get_csv(session_id)
    
    if not csv_data:
        raise HTTPException(status_code=404, detail="CSV not found")
    
    analyses = store.analyses.get(session_id, {})
    
    return {
        "session_id": session_id,
        "analyses": [
            {
                "analysis_type": atype,
                "generated_at": adata["generated_at"]
            }
            for atype, adata in analyses.items()
        ]
    }


@app.get("/api/analyses/{analysis_type}")
def get_analysis(session_id: str, analysis_type: str):
    """
    GET /api/analyses/{type}?session_id={id} - Obtener análisis
    
    Si analysis_type == "all": Retorna todos los análisis como dict con claves
    Si analysis_type específico: Retorna ese análisis envuelto con su clave
    
    Ejemplos:
    - GET /api/analyses/all?session_id=abc → {yearly_summary: {...}, monthly_summary: {...}, ...}
    - GET /api/analyses/cash_flow?session_id=abc → {cash_flow: {...}}
    """
    csv_data = store.get_csv(session_id)
    
    if not csv_data:
        raise HTTPException(status_code=404, detail="CSV not found")
    
    # Caso especial: "all" devuelve todos los análisis
    if analysis_type == "all":
        analyses = store.analyses.get(session_id, {})
        
        if not analyses:
            raise HTTPException(
                status_code=404, 
                detail="No analyses found. Run POST /api/analyses first."
            )
        
        # Construir objeto con todos los análisis
        all_results = {}
        for atype, adata in analyses.items():
            all_results[atype] = adata["result"].get(atype, adata["result"])
        
        return clean(jsonable_encoder(all_results))
    
    # Caso específico: devolver un análisis con su clave
    result = store.get_analysis(session_id, analysis_type)
    
    if not result:
        raise HTTPException(
            status_code=404, 
            detail=f"Analysis '{analysis_type}' not found. Run POST /api/analyses first."
        )
    
    # Retornar envuelto con su clave
    return clean(jsonable_encoder({
        analysis_type: result["result"].get(analysis_type, result["result"])
    }))


# ============================================================================
# RECURSO: /api/tools (Metadatos)
# ============================================================================

@app.get("/api/tools")
def list_tools():
    """
    GET /api/tools - Lista herramientas disponibles y sus parámetros
    """
    return {
        "tools": [
            {
                "name": "yearly_summary",
                "description": "Análisis de estados financieros anuales",
                "input_format": "financial_statement",
                "required_columns": ["concepto", "a2020", "a2021", "..."],
                "parameters": {}
            },
            {
                "name": "monthly_summary",
                "description": "Resumen mensual desde datos transaccionales",
                "input_format": "transactional",
                "required_columns": ["fecha", "importe"],
                "parameters": {}
            },
            {
                "name": "budget_variance",
                "description": "Análisis de desviaciones presupuestarias",
                "input_format": "budget",
                "required_columns": ["categoria", "presupuesto", "real"],
                "parameters": {}
            },
            {
                "name": "cash_flow",
                "description": "Análisis de flujo de caja",
                "input_format": "transactional",
                "required_columns": ["fecha", "importe"],
                "parameters": {
                    "saldo_inicial": {
                        "type": "number",
                        "default": 0.0,
                        "description": "Saldo de caja inicial"
                    }
                }
            }
        ]
    }


@app.get("/api/examples")
def get_examples():
    """
    GET /api/examples - Datos de ejemplo para testing
    """
    return {
        "yearly_summary": {
            "year": 2025,
            "total_income": 15000,
            "total_expenses": 5000,
            "net_result": 10000,
            "currency": "EUR"
        },
        "monthly_summary": {
            "months": [
                {
                    "month": "2025-01",
                    "income": 10000,
                    "expenses": 3000,
                    "net": 7000
                },
                {
                    "month": "2025-02",
                    "income": 5000,
                    "expenses": 2000,
                    "net": 3000
                }
            ],
            "totals": {
                "income": 15000,
                "expenses": 5000,
                "net": 10000
            }
        },
        "budget_variance": {
            "by_category": [
                {
                    "category": "Marketing",
                    "budgeted": 2000,
                    "actual": 2500,
                    "variance": 500,
                    "variance_pct": 25.0
                },
                {
                    "category": "Operaciones",
                    "budgeted": 3000,
                    "actual": 2500,
                    "variance": -500,
                    "variance_pct": -16.7
                }
            ],
            "total_variance": 0
        },
        "cash_flow": {
            "initial_balance": 1000,
            "periods": [
                {
                    "date": "2025-01-31",
                    "inflow": 10000,
                    "outflow": 3000,
                    "net_flow": 7000,
                    "ending_balance": 8000
                },
                {
                    "date": "2025-02-28",
                    "inflow": 5000,
                    "outflow": 2000,
                    "net_flow": 3000,
                    "ending_balance": 11000
                }
            ],
            "final_balance": 11000
        }
    }


# Para correr: uvicorn main:app --reload --port 8000