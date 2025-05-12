import { FormStatus } from '../types';
import { INTERNAL_URLS } from '../constants/urls';

/**
 * Durable Object para mantener un índice global de formularios
 * Permite consultar formularios por estado sin necesidad de acceder a cada DO individual
 */
export class CSEIndexDurableObject {
  state: DurableObjectState;
  env: any;
  
  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;
  }
  
  /**
   * Inicializa el índice si no existe
   */
  async initialize() {
    const index = await this.state.storage.get('formIndex');
    if (!index) {
      await this.state.storage.put('formIndex', {});
    }
  }
  
  /**
   * Actualiza la información de un formulario en el índice
   */
  async updateIndex(formId: string, formData: any) {
    await this.initialize();
    
    // Obtener el índice actual
    const index = await this.state.storage.get<Record<string, any>>('formIndex') || {};
    
    // Actualizar la entrada para este formulario
    index[formId] = {
      clientId: formData.clientId,
      status: formData.status,
      lastUpdatedAt: formData.lastUpdatedAt,
      createdBy: formData.createdBy,
      title: formData.steps?.informacion?.data?.nombre || `Formulario ${formId}`
    };
    
    // Guardar el índice actualizado
    await this.state.storage.put('formIndex', index);
    
    return new Response('Index updated', { status: 200 });
  }
  
  /**
   * Obtiene formularios filtrados por estado
   */
  async getFormsByStatus(status: FormStatus) {
    await this.initialize();
    
    // Obtener el índice
    const index = await this.state.storage.get('formIndex') || {};
    
    // Filtrar por estado
    const filteredForms = Object.entries(index)
      .filter(([_, data]) => data.status === status)
      .map(([formId, data]) => ({
        formId,
        ...data
      }));
    
    return new Response(JSON.stringify(filteredForms), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  /**
   * Maneja solicitudes HTTP al Durable Object
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    // Verificar autenticación
    const user = request.headers.get('X-User');
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    
    // Endpoint para actualizar el índice
    if (url.pathname === new URL(INTERNAL_URLS.INDEX.UPDATE).pathname && request.method === 'POST') {
      const data = await request.json() as { formId: string, formData: any };
      return this.updateIndex(data.formId, data.formData);
    }
    
    // Endpoint para obtener formularios por estado
    if (url.pathname === new URL(INTERNAL_URLS.INDEX.FORMS_BY_STATUS).pathname && request.method === 'GET') {
      const status = url.searchParams.get('status');
      if (!status) {
        return new Response('Status parameter is required', { status: 400 });
      }
      
      return this.getFormsByStatus(status as FormStatus);
    }
    
    return new Response('Not found', { status: 404 });
  }
}
