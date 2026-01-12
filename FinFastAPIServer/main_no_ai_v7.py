from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.encoders import jsonable_encoder
import math
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import logging
from typing import Optional, Dict, Any, List
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

class AnalysisRequest(BaseModel):
    analysis_type: Optional[str] = "all"  # Por defecto ejecuta todos
    params: Optional[Dict[str, Any]] = {}


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
        "name": "Financial Analysis API v7",
        "version": "7.0",
        "endpoints": {
            "csvs": "/api/csvs",
            "analyses": "/api/analyses",
            "tools":"/api/tools",
            "tools":"/api/tools",
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
    params se puede usar para saldo inicial en cashflow u otros parámtros para informes futuros
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

# ============================================================================
# RECURSO: /api/examples (Metadatos)
# ============================================================================

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


# Para correr: uvicorn main_no_ai_v7:app --reload --port 8000