/**
 * RESTful API Client for Financial Analysis
 * 
 * Este cliente es AGNÓSTICO del backend.
 * Solo conoce los recursos REST estándar: /csvs, /analyses, /chat
 * Si cambias la implementación en Python, este archivo NO necesita cambios.
 */

const API_URL = 'http://localhost:8000/api';

// ============================================================================
// CLASE BASE PARA RECURSOS REST
// ============================================================================

class RestResource {
  constructor(baseUrl, resourcePath) {
    this.baseUrl = baseUrl;
    this.resourcePath = resourcePath;
  }

  async request(method, path = '', body = null, params = {}) {
    const url = new URL(`${this.baseUrl}${this.resourcePath}${path}`);

    // Añadir query params
    Object.keys(params).forEach(key =>
      url.searchParams.append(key, params[key])
    );

    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // CRUD estándar
  async list(params = {}) {
    return this.request('GET', '', null, params);
  }

  async get(id, params = {}) {
    return this.request('GET', `/${id}`, null, params);
  }

  async create(data, params = {}) {
    return this.request('POST', '', data, params);
  }

  async update(id, data, params = {}) {
    return this.request('PUT', `/${id}`, data, params);
  }

  async delete(id, params = {}) {
    return this.request('DELETE', `/${id}`, null, params);
  }
}

// ============================================================================
// RECURSOS ESPECÍFICOS
// ============================================================================

/**
 * Recurso: /api/csvs
 * Gestiona archivos CSV subidos
 */
class CSVResource extends RestResource {
  constructor(baseUrl) {
    super(baseUrl, '/csvs');
  }

  /**
   * POST /api/csvs - Subir CSV
   */
  async upload(file, sessionId = 'default') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('session_id', sessionId);

    const url = `${this.baseUrl}${this.resourcePath}?session_id=${sessionId}`;
    const response = await fetch(url, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * GET /api/csvs - Listar todos
   */
  async listAll() {
    return this.list();
  }

  /**
   * GET /api/csvs/{id} - Obtener uno específico
   */
  async getById(sessionId, previewOnly = true) {
    return this.get(sessionId, { preview_only: previewOnly });
  }

  /**
   * DELETE /api/csvs/{id} - Eliminar
   */
  async deleteById(sessionId) {
    return this.delete(sessionId);
  }
}

/**
 * Recurso: /api/analyses
 * Gestiona análisis financieros
 */
class AnalysisResource extends RestResource {
  constructor(baseUrl) {
    super(baseUrl, '/analyses');
  }

  /**
   * POST /api/analyses - Crear análisis
   */
  async run(sessionId, analysisType){//, params = {}) {
    return this.create(
      { analysis_type: analysisType},//, params },
      { session_id: sessionId }
    );
  }

  /**
   * POST /api/analyses - Crear todos análisis
   */
  async runAllAnalyses(sessionId) {
    return this.create(
      { session_id: sessionId }
    );
  }

  /**
   * GET /api/analyses - Listar análisis de una sesión
   */
  async listForSession(sessionId) {
    return this.list({ session_id: sessionId });
  }

  /**
   * GET /api/analyses/{type} - Obtener resultado de análisis específico
   */
  async getByType(sessionId, analysisType) {
    return this.get(analysisType, { session_id: sessionId });
  }

  /**
     * GET /api/analyses - Obtener todos los análisis de una sesión
     * Retorna: { yearly_summary, monthly_summary, budget_variance, cash_flow }
     */
  async getAllAnalyses(sessionId) {
    return this.list({ session_id: sessionId });
  }


}

/**
 * Recurso: /api/chat
 * Interacción conversacional con AI
 */
class ChatResource {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async send(prompt, options = {}) {
    const {
      systemMessage = 'Eres un asistente financiero experto.',
      useLocal = false,
      csvData = null
    } = options;

    const response = await fetch(`${this.baseUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        system_message: systemMessage,
        use_local: useLocal,
        csv_data: csvData
      })
    });

    if (!response.ok) {
      throw new Error(`Chat error: ${response.statusText}`);
    }

    return response.json();
  }
}

/**
 * Recurso: /api/tools
 * Metadatos sobre herramientas disponibles
 */
class ToolsResource {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async list() {
    const response = await fetch(`${this.baseUrl}/tools`);
    if (!response.ok) {
      throw new Error(`Tools error: ${response.statusText}`);
    }
    return response.json();
  }

  async getExamples() {
    const response = await fetch(`${this.baseUrl}/examples`);
    if (!response.ok) {
      throw new Error(`Examples error: ${response.statusText}`);
    }
    return response.json();
  }
}

// ============================================================================
// API CLIENT PRINCIPAL
// ============================================================================

class FinancialAPI {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.csvs = new CSVResource(baseUrl);
    this.analyses = new AnalysisResource(baseUrl);
    this.chat = new ChatResource(baseUrl);
    this.tools = new ToolsResource(baseUrl);
  }

  async health() {
    const response = await fetch(`${this.baseUrl}/health`);
    return response.json();
  }
}

// ============================================================================
// INSTANCIA SINGLETON
// ============================================================================

const api = new FinancialAPI(API_URL);

// ============================================================================
// FUNCIONES HELPER (Compatibilidad con código existente)
// ============================================================================

/**
 * Helpers de formateo (sin cambios)
 */
export const formatCurrency = (amount, currency = 'EUR') => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

export const formatPercentage = (value, decimals = 1) => {
  return `${value > 0 ? '+' : ''}${value.toFixed(decimals)}%`;
};

export const getValueColor = (value) => {
  if (value > 0) return 'text-green-600';
  if (value < 0) return 'text-red-600';
  return 'text-gray-600';
};

export const parseAPIError = (error) => {
  if (error.response?.data?.detail) {
    return error.response.data.detail;
  }
  return error.message || 'Error desconocido';
};

// ============================================================================
// EXPORTS
// ============================================================================

// Export del API principal
export default api;

// Exports para compatibilidad con código existente
export const {
  csvs,
  analyses,
  chat,
  tools
} = api;

// Funciones de conveniencia (wrappers)
export const uploadCSV = (file, sessionId) => api.csvs.upload(file, sessionId);
export const getCSVData = (sessionId, previewOnly) => api.csvs.getById(sessionId, previewOnly);
export const deleteCSVData = (sessionId) => api.csvs.deleteById(sessionId);
export const listCSVs = () => api.csvs.listAll();

export const runAnalysis = (sessionId, type, params) => api.analyses.run(sessionId, type);//, params);
export const runAllAnalyses = (sessionId) => api.analyses.runAllAnalyses(sessionId);
export const getAllAnalyses = (sessionId) => api.analyses.getAllAnalyses(sessionId);
export const getAnalysis = (sessionId, type) => api.analyses.getByType(sessionId, type);
export const listAnalyses = (sessionId) => api.analyses.listForSession(sessionId);

export const sendMessage = (prompt, useLocal, csvData) => api.chat.send(prompt, { useLocal, csvData });

export const getTools = () => api.tools.list();
export const getExamples = () => api.tools.getExamples();

export const checkHealth = () => api.health();