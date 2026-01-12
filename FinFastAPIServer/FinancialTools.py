import pandas as pd
import json
import re
from datetime import datetime
from typing import Dict, List, Any, Optional


class FinancialTools:
    """
    Herramientas para análisis financiero basadas en datos CSV.
    Soporta tanto formato de transacciones como formato de estados financieros anuales.
    
    Formatos soportados:
    1. Transaccional: fecha, importe (para análisis mensual/flujo de caja)
    2. Estados Financieros: Concepto, a2020, a2021, a2022... (formato estándar contable)
    """
    
    @staticmethod
    def _parse_csv_data(csv_data: Dict) -> pd.DataFrame:
        """Convierte los datos CSV en DataFrame de pandas."""
        if isinstance(csv_data, list):
            df = pd.DataFrame(csv_data)
        elif isinstance(csv_data, dict):
            if 'headers' in csv_data and 'rows' in csv_data:
                df = pd.DataFrame(csv_data['rows'], columns=csv_data['headers'])
            else:
                df = pd.DataFrame(csv_data)
        else:
            raise ValueError("Formato de CSV no reconocido")
        
        return df
    
    @staticmethod
    def _normalize_column_names(df: pd.DataFrame) -> pd.DataFrame:
        """Normaliza nombres de columnas."""
        df.columns = df.columns.str.strip().str.lower()
        return df
    
    @staticmethod
    def _detect_format(df: pd.DataFrame) -> str:
        """
        Detecta el formato del CSV.
        Returns: 'financial_statement' o 'transactional'
        """
        cols = df.columns.tolist()
        
        # Detectar formato de estados financieros (columnas con años: a2020, a2021, etc.)
        year_pattern = re.compile(r'^a?\d{4}$')
        year_cols = [col for col in cols if year_pattern.match(str(col))]
        
        if len(year_cols) >= 2 and any(term in ' '.join(cols).lower() 
                                       for term in ['concepto', 'nombre', 'format']):
            return 'financial_statement'
        
        # Detectar formato transaccional
        if any(term in ' '.join(cols).lower() for term in ['fecha', 'date']) and \
           any(term in ' '.join(cols).lower() for term in ['importe', 'monto', 'amount']):
            return 'transactional'
        
        return 'unknown'
    
    @staticmethod
    def _extract_year_columns(df: pd.DataFrame) -> List[str]:
        """Extrae columnas que representan años."""
        year_pattern = re.compile(r'^a?(\d{4})$')
        year_cols = []
        
        for col in df.columns:
            match = year_pattern.match(str(col))
            if match:
                year_cols.append(col)
        
        return sorted(year_cols)
    
    @staticmethod
    def _clean_numeric_value(value) -> float:
        """Limpia y convierte valores numéricos (maneja comas, puntos, etc.)."""
        if pd.isna(value) or value == '':
            return 0.0
        
        # Convertir a string
        str_value = str(value).strip()
        
        # Eliminar símbolos de moneda y espacios
        str_value = re.sub(r'[€$£\s]', '', str_value)
        
        # Manejar formato europeo (1.234,56) y americano (1,234.56)
        if ',' in str_value and '.' in str_value:
            # Determinar cuál es el separador decimal
            last_comma = str_value.rfind(',')
            last_dot = str_value.rfind('.')
            
            if last_comma > last_dot:
                # Formato europeo
                str_value = str_value.replace('.', '').replace(',', '.')
            else:
                # Formato americano
                str_value = str_value.replace(',', '')
        elif ',' in str_value:
            # Solo comas - asumir formato europeo si está en posición decimal
            if str_value.rfind(',') > len(str_value) - 4:
                str_value = str_value.replace(',', '.')
            else:
                str_value = str_value.replace(',', '')
        
        try:
            return float(str_value)
        except:
            return 0.0
    
    @staticmethod
    def _categorize_concept(concepto: str) -> str:
        """Categoriza conceptos financieros en ingresos, gastos, activos, pasivos."""
        concepto_lower = concepto.lower()
        
        # Ingresos
        if any(term in concepto_lower for term in ['ingreso', 'venta', 'revenue', 'income']):
            return 'Ingresos'
        
        # Gastos
        if any(term in concepto_lower for term in ['gasto', 'costo', 'expense', 'cost']):
            return 'Gastos'
        
        # Activos
        if any(term in concepto_lower for term in ['activo', 'asset', 'caja', 'banco']):
            return 'Activos'
        
        # Pasivos
        if any(term in concepto_lower for term in ['pasivo', 'deuda', 'liability', 'debt']):
            return 'Pasivos'
        
        # Patrimonio
        if any(term in concepto_lower for term in ['patrimonio', 'capital', 'equity']):
            return 'Patrimonio'
        
        return 'Otros'

    # ========================================================================
    # ANÁLISIS PARA FORMATO DE ESTADOS FINANCIEROS
    # ========================================================================
    
    @staticmethod
    def get_yearly_summary(csv_data: Dict) -> Dict[str, Any]:
        """
        Resumen financiero anual desde estados financieros.
        
        Formato esperado:
        - Columnas: Concepto, a2020, a2021, a2022...
        - Filas: Conceptos financieros (Ventas, Gastos Operativos, etc.)
        """
        try:
            df = FinancialTools._parse_csv_data(csv_data)
            df = FinancialTools._normalize_column_names(df)
            
            # Detectar formato
            format_type = FinancialTools._detect_format(df)
            if format_type != 'financial_statement':
                return {
                    "error": "CSV no está en formato de estados financieros",
                    "formato_detectado": format_type,
                    "sugerencia": "Use get_monthly_summary para datos transaccionales"
                }
            
            # Identificar columna de conceptos
            concept_col = None
            for col in ['concepto', 'nombre', 'name', 'concept']:
                if col in df.columns:
                    concept_col = col
                    break
            
            if not concept_col:
                return {"error": "No se encontró columna de conceptos"}
            
            # Extraer columnas de años
            year_cols = FinancialTools._extract_year_columns(df)
            if len(year_cols) < 2:
                return {"error": "Se necesitan al menos 2 años de datos"}
            
            # Limpiar valores numéricos
            for year_col in year_cols:
                df[year_col] = df[year_col].apply(FinancialTools._clean_numeric_value)
            
            # Categorizar conceptos
            df['categoria'] = df[concept_col].apply(FinancialTools._categorize_concept)
            
            # Calcular totales por categoría y año
            resumen_anual = []
            
            for year_col in year_cols:
                year_num = re.search(r'\d{4}', year_col).group() # pyright: ignore[reportOptionalMemberAccess]
                
                # Agrupar por categoría
                categoria_totals = df.groupby('categoria')[year_col].sum().to_dict()
                
                ingresos = categoria_totals.get('Ingresos', 0)
                gastos = abs(categoria_totals.get('Gastos', 0))  # Convertir a positivo para visualización
                resultado = ingresos - gastos
                
                resumen_anual.append({
                    'año': year_num,
                    'ingresos': float(ingresos),
                    'gastos': float(gastos),
                    'resultado': float(resultado),
                    'margen': float((resultado / ingresos * 100) if ingresos != 0 else 0)
                })
            
            # Calcular variaciones año a año
            variaciones = []
            for i in range(1, len(resumen_anual)):
                año_anterior = resumen_anual[i-1]
                año_actual = resumen_anual[i]
                
                var_ingresos = año_actual['ingresos'] - año_anterior['ingresos']
                var_gastos = año_actual['gastos'] - año_anterior['gastos']
                var_resultado = año_actual['resultado'] - año_anterior['resultado']
                
                variaciones.append({
                    'periodo': f"{año_anterior['año']}-{año_actual['año']}",
                    'variacion_ingresos': float(var_ingresos),
                    'variacion_ingresos_pct': float((var_ingresos / año_anterior['ingresos'] * 100) if año_anterior['ingresos'] != 0 else 0),
                    'variacion_gastos': float(var_gastos),
                    'variacion_gastos_pct': float((var_gastos / año_anterior['gastos'] * 100) if año_anterior['gastos'] != 0 else 0),
                    'variacion_resultado': float(var_resultado),
                    'variacion_resultado_pct': float((var_resultado / año_anterior['resultado'] * 100) if año_anterior['resultado'] != 0 else 0)
                })
            
            # Desglose por concepto (top 10 más relevantes)
            conceptos_detalle = []
            for _, row in df.iterrows():
                if row['categoria'] in ['Ingresos', 'Gastos']:
                    concepto_data = {
                        'concepto': row[concept_col],
                        'categoria': row['categoria'],
                        'valores': {}
                    }
                    for year_col in year_cols:
                        year_num = re.search(r'\d{4}', year_col).group()
                        concepto_data['valores'][year_num] = float(row[year_col])
                    
                    conceptos_detalle.append(concepto_data)
            
            # Ordenar por valor del último año
            if year_cols:
                ultimo_año = re.search(r'\d{4}', year_cols[-1]).group()
                conceptos_detalle.sort(
                    key=lambda x: abs(x['valores'].get(ultimo_año, 0)),
                    reverse=True
                )
            
            resultado = {
                "resumen_anual": resumen_anual,
                "variaciones": variaciones,
                "conceptos_principales": conceptos_detalle[:10],
                "periodo_analizado": {
                    "año_inicio": resumen_anual[0]['año'],
                    "año_fin": resumen_anual[-1]['año'],
                    "años_totales": len(resumen_anual)
                },
                "totales": {
                    "ingresos_acumulados": sum(r['ingresos'] for r in resumen_anual),
                    "gastos_acumulados": sum(r['gastos'] for r in resumen_anual),
                    "resultado_acumulado": sum(r['resultado'] for r in resumen_anual)
                }
            }
            
            return resultado
            
        except Exception as e:
            return {"error": f"Error al procesar datos: {str(e)}"}

    # ========================================================================
    # ANÁLISIS TRANSACCIONAL (mantenido de la versión anterior)
    # ========================================================================
    
    @staticmethod
    def get_monthly_summary(csv_data: Dict) -> Dict[str, Any]:
        """Resumen mensual desde datos transaccionales."""
        try:
            df = FinancialTools._parse_csv_data(csv_data)
            df = FinancialTools._normalize_column_names(df)
            
            format_type = FinancialTools._detect_format(df)
            if format_type == 'financial_statement':
                return {
                    "error": "Este CSV parece ser un estado financiero anual",
                    "sugerencia": "Use get_yearly_summary en su lugar"
                }
            
            # Identificar columnas
            date_col = None
            amount_col = None
            
            for col in df.columns:
                if 'fecha' in col or 'date' in col:
                    date_col = col
                if 'importe' in col or 'monto' in col or 'amount' in col or 'cantidad' in col:
                    amount_col = col
            
            if not date_col or not amount_col:
                return {
                    "error": "No se encontraron columnas de fecha o importe",
                    "columns_found": list(df.columns)
                }
            
            df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
            df = df.dropna(subset=[date_col])
            df[amount_col] = pd.to_numeric(df[amount_col], errors='coerce')
            df = df.dropna(subset=[amount_col])
            
            df['periodo'] = df[date_col].dt.to_period('M')
            
            resumen = df.groupby('periodo')[amount_col].agg([
                ('ingresos', lambda x: x[x > 0].sum()),
                ('gastos', lambda x: x[x < 0].sum()),
                ('resultado', 'sum')
            ]).reset_index()
            
            resumen['periodo'] = resumen['periodo'].astype(str)
            
            resultado = {
                "resumen_mensual": resumen.to_dict('records'),
                "total_periodo": {
                    "ingresos_totales": float(resumen['ingresos'].sum()),
                    "gastos_totales": float(resumen['gastos'].sum()),
                    "resultado_neto": float(resumen['resultado'].sum())
                },
                "meses_analizados": len(resumen),
                "fecha_inicio": str(df[date_col].min().date()),
                "fecha_fin": str(df[date_col].max().date())
            }
            
            return resultado
            
        except Exception as e:
            return {"error": f"Error al procesar datos: {str(e)}"}
    
    @staticmethod
    def get_budget_variance(csv_data: Dict) -> Dict[str, Any]:
        """Análisis de variaciones presupuestarias."""
        try:
            df = FinancialTools._parse_csv_data(csv_data)
            df = FinancialTools._normalize_column_names(df)
            
            # Identificar columnas
            cat_col = None
            budget_col = None
            actual_col = None
            
            for col in df.columns:
                if 'categoria' in col or 'category' in col or 'concepto' in col:
                    cat_col = col
                if 'presupuesto' in col or 'budget' in col or 'planeado' in col:
                    budget_col = col
                if 'real' in col or 'actual' in col or 'ejecutado' in col:
                    actual_col = col
            
            if not all([cat_col, budget_col, actual_col]):
                return {
                    "error": "Faltan columnas necesarias (categoria, presupuesto, real)",
                    "columns_found": list(df.columns)
                }
            
            df[budget_col] = pd.to_numeric(df[budget_col], errors='coerce')
            df[actual_col] = pd.to_numeric(df[actual_col], errors='coerce')
            df = df.dropna(subset=[budget_col, actual_col])
            
            df['diferencia'] = df[actual_col] - df[budget_col]
            df['variacion_pct'] = (df['diferencia'] / df[budget_col].abs()) * 100
            
            explicaciones = []
            for _, row in df.iterrows():
                categoria = row[cat_col]
                presup = row[budget_col]
                real = row[actual_col]
                diff = row['diferencia']
                pct = row['variacion_pct']
                
                if diff >= 0:
                    direccion = "superó el presupuesto"
                    calificacion = "sobrecosto" if presup > 0 else "mayor ingreso"
                else:
                    direccion = "fue inferior al presupuesto"
                    calificacion = "ahorro" if presup > 0 else "menor ingreso"
                
                if abs(pct) > 20:
                    severidad = "ALTA"
                elif abs(pct) > 10:
                    severidad = "MEDIA"
                else:
                    severidad = "BAJA"
                
                explicaciones.append({
                    "categoria": categoria,
                    "presupuesto": float(presup),
                    "real": float(real),
                    "diferencia": float(diff),
                    "variacion_porcentual": float(pct),
                    "severidad": severidad,
                    "explicacion": f"{categoria}: Presupuesto {presup:,.2f}, Real {real:,.2f} → "
                                   f"{direccion} en {abs(diff):,.2f} ({pct:+.1f}%). {calificacion.capitalize()}."
                })
            
            explicaciones.sort(key=lambda x: abs(x['variacion_porcentual']), reverse=True)
            
            resultado = {
                "variaciones": explicaciones,
                "resumen": {
                    "total_presupuestado": float(df[budget_col].sum()),
                    "total_real": float(df[actual_col].sum()),
                    "diferencia_total": float(df['diferencia'].sum()),
                    "variacion_total_pct": float((df['diferencia'].sum() / df[budget_col].abs().sum()) * 100),
                    "categorias_analizadas": len(df)
                },
                "alertas": {
                    "variaciones_altas": len([e for e in explicaciones if e['severidad'] == 'ALTA']),
                    "sobrecostos": len([e for e in explicaciones if e['diferencia'] > 0 and e['presupuesto'] > 0]),
                    "ahorros": len([e for e in explicaciones if e['diferencia'] < 0 and e['presupuesto'] > 0])
                }
            }
            
            return resultado
            
        except Exception as e:
            return {"error": f"Error al procesar variaciones: {str(e)}"}
    
    @staticmethod
    def get_cash_flow(csv_data: Dict, saldo_inicial: float = 0.0) -> Dict[str, Any]:
        """Análisis de flujo de caja desde datos transaccionales."""
        try:
            df = FinancialTools._parse_csv_data(csv_data)
            df = FinancialTools._normalize_column_names(df)
            
            format_type = FinancialTools._detect_format(df)
            if format_type == 'financial_statement':
                return {
                    "error": "Este CSV parece ser un estado financiero anual",
                    "sugerencia": "El análisis de flujo de caja requiere datos transaccionales"
                }
            
            date_col = None
            amount_col = None
            
            for col in df.columns:
                if 'fecha' in col or 'date' in col:
                    date_col = col
                if 'importe' in col or 'monto' in col or 'amount' in col or 'cantidad' in col:
                    amount_col = col
            
            if not date_col or not amount_col:
                return {
                    "error": "No se encontraron columnas de fecha o importe",
                    "columns_found": list(df.columns)
                }
            
            df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
            df = df.dropna(subset=[date_col])
            df[amount_col] = pd.to_numeric(df[amount_col], errors='coerce')
            df = df.dropna(subset=[amount_col])
            
            df['periodo'] = df[date_col].dt.to_period('M')
            
            flujo = df.groupby('periodo')[amount_col].agg([
                ('entradas', lambda x: x[x > 0].sum()),
                ('salidas', lambda x: abs(x[x < 0].sum())),
                ('flujo_neto', 'sum')
            ]).reset_index()
            
            flujo['saldo_acumulado'] = flujo['flujo_neto'].cumsum() + saldo_inicial
            flujo['periodo'] = flujo['periodo'].astype(str)
            
            meses_negativos = flujo[flujo['flujo_neto'] < 0]
            saldo_negativo = flujo[flujo['saldo_acumulado'] < 0]
            
            alertas = []
            if len(meses_negativos) > 0:
                alertas.append(f"Se detectaron {len(meses_negativos)} meses con flujo negativo")
            if len(saldo_negativo) > 0:
                alertas.append(f"¡ALERTA! Saldo de caja negativo en {len(saldo_negativo)} meses")
            
            flujo_total = flujo['flujo_neto'].sum()
            promedio_mensual = flujo['flujo_neto'].mean()
            
            resultado = {
                "flujo_mensual": flujo.to_dict('records'),
                "resumen": {
                    "saldo_inicial": float(saldo_inicial),
                    "saldo_final": float(flujo['saldo_acumulado'].iloc[-1]),
                    "flujo_total_periodo": float(flujo_total),
                    "promedio_mensual": float(promedio_mensual),
                    "total_entradas": float(flujo['entradas'].sum()),
                    "total_salidas": float(flujo['salidas'].sum()),
                    "meses_analizados": len(flujo)
                },
                "alertas": alertas,
                "analisis": {
                    "meses_con_flujo_positivo": int((flujo['flujo_neto'] > 0).sum()),
                    "meses_con_flujo_negativo": int((flujo['flujo_neto'] < 0).sum()),
                    "mejor_mes": flujo.loc[flujo['flujo_neto'].idxmax()]['periodo'],
                    "peor_mes": flujo.loc[flujo['flujo_neto'].idxmin()]['periodo'],
                    "saldo_minimo": float(flujo['saldo_acumulado'].min()),
                    "saldo_maximo": float(flujo['saldo_acumulado'].max())
                }
            }
            
            return resultado
            
        except Exception as e:
            return {"error": f"Error al procesar flujo de caja: {str(e)}"}


# Funciones wrapper para function calling
def get_yearly_summary(csv_data: Dict) -> str:
    """Wrapper para resumen anual desde estados financieros."""
    result = FinancialTools.get_yearly_summary(csv_data)
    return json.dumps(result, ensure_ascii=False, indent=2)

def get_monthly_summary(csv_data: Dict) -> str:
    """Wrapper para resumen mensual desde transacciones."""
    result = FinancialTools.get_monthly_summary(csv_data)
    return json.dumps(result, ensure_ascii=False, indent=2)

def get_budget_variance(csv_data: Dict) -> str:
    """Wrapper para variaciones presupuestarias."""
    result = FinancialTools.get_budget_variance(csv_data)
    return json.dumps(result, ensure_ascii=False, indent=2)

def get_cash_flow(csv_data: Dict, saldo_inicial: float = 0.0) -> str:
    """Wrapper para flujo de caja."""
    result = FinancialTools.get_cash_flow(csv_data, saldo_inicial)
    return json.dumps(result, ensure_ascii=False, indent=2)