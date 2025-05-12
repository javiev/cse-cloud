import { FormStatus, JWTPayload } from '../types';
import { INTERNAL_URLS } from '../constants/urls';
import { BaseDurableObject } from './base-durable-object';
import { StateManager } from './state-manager';
import { Router } from './router';

/**
 * Durable Object para mantener un índice global de formularios
 * Permite consultar formularios por estado sin necesidad de acceder a cada DO individual
 */
export class CSEIndexDurableObject extends BaseDurableObject {
  private indexManager: StateManager<Record<string, any>>;
  private router: Router;
  
  constructor(state: DurableObjectState, env: any) {
    super(state, env);
    this.indexManager = new StateManager<Record<string, any>>(state, 'formIndex');
    this.router = this.setupRouter();
  }
  
  /**
   * Configura el enrutador con las rutas disponibles
   */
  private setupRouter(): Router {
    const router = new Router();
    
    // Ruta para actualizar el índice
    router.register('POST', INTERNAL_URLS.INDEX.UPDATE, this.handleUpdateIndex.bind(this));
    
    // Ruta para obtener formularios por estado
    router.register('GET', INTERNAL_URLS.INDEX.FORMS_BY_STATUS, this.handleGetFormsByStatus.bind(this));
    
    return router;
  }
  
  /**
   * Inicializa el índice si no existe
   */
  async initialize(): Promise<Record<string, any>> {
    return await this.indexManager.initialize({});
  }
  
  /**
   * Actualiza la información de un formulario en el índice
   */
  async handleUpdateIndex(request: Request): Promise<Response> {
    const user = this.getUserFromRequest(request);
    const errorResponse = this.validateUser(user);
    if (errorResponse) return errorResponse;
    
    const data = await request.json() as { formId: string, formData: any };
    await this.updateIndex(data.formId, data.formData);
    
    return this.createResponse({ message: 'Index updated' });
  }
  
  /**
   * Implementación de la actualización del índice
   */
  private async updateIndex(formId: string, formData: any): Promise<void> {
    await this.initialize();
    
    await this.indexManager.update(index => {
      index[formId] = {
        clientId: formData.clientId,
        status: formData.status,
        lastUpdatedAt: formData.lastUpdatedAt,
        createdBy: formData.createdBy,
        title: formData.steps?.informacion?.data?.nombre || `Formulario ${formId}`
      };
      return index;
    });
  }
  
  /**
   * Maneja la solicitud para obtener formularios por estado
   */
  async handleGetFormsByStatus(request: Request): Promise<Response> {
    const user = this.getUserFromRequest(request);
    const errorResponse = this.validateUser(user);
    if (errorResponse) return errorResponse;
    
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    
    if (!status) {
      return this.createErrorResponse('Status parameter is required', 400);
    }
    
    const forms = await this.getFormsByStatus(status as FormStatus);
    return this.createResponse(forms);
  }
  
  /**
   * Implementación para obtener formularios filtrados por estado
   */
  private async getFormsByStatus(status: FormStatus): Promise<any[]> {
    const index = await this.initialize();
    
    return Object.entries(index)
      .filter(([_, data]) => data.status === status)
      .map(([formId, data]) => ({
        formId,
        ...data
      }));
  }
  
  /**
   * Maneja solicitudes HTTP al Durable Object
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    // Buscar una ruta que coincida
    const match = this.router.match(request.method, url.pathname);
    
    if (match) {
      return match.handler.handler(request, match.params);
    }
    
    return this.createErrorResponse('Not found', 404);
  }
}
