import { CSEForm, FormStatus, JWTPayload, StepStatus, UserRole, FormStep } from '../types';
import { StepId, createStep, initializeSteps, FORM_STEPS } from '../types/form-steps';
import { ERROR_MESSAGES } from '../constants';
import { INTERNAL_URLS } from '../constants/urls';
import { isValidStatusTransition } from '../auth/authorization';
import { BaseDurableObject } from './base-durable-object';
import { StateManager } from './state-manager';
import { Router, RouteParams } from './router';

/**
 * Durable Object para almacenar el estado de un formulario CSE por cliente
 * Cada cliente tiene su propio Durable Object con ID: cse-${clientId}
 */
export class CSEDurableObject extends BaseDurableObject {
  private formManager: StateManager<CSEForm>;
  private router: Router;
  private form: CSEForm | null = null;

  constructor(state: DurableObjectState, env: any) {
    super(state, env);
    this.formManager = new StateManager<CSEForm>(state, 'form');
    this.router = this.setupRouter();
  }
  
  /**
   * Configura el enrutador con las rutas disponibles
   */
  private setupRouter(): Router {
    const router = new Router();
    
    // Rutas para el formulario
    router.register('GET', '/:clientId', this.handleGetForm.bind(this));
    router.register('POST', '/:clientId/steps/:stepId', this.handleUpdateStep.bind(this));
    router.register('POST', '/:clientId/submit', this.handleSubmitToInternalReview.bind(this));
    router.register('POST', '/:clientId/internal-review/approve', this.handleInternalReviewApprove.bind(this));
    router.register('POST', '/:clientId/internal-review/request-corrections', this.handleInternalReviewRequestCorrections.bind(this));
    router.register('POST', '/:clientId/authority-review/approve', this.handleAuthorityReviewApprove.bind(this));
    router.register('POST', '/:clientId/authority-review/request-corrections', this.handleAuthorityReviewRequestCorrections.bind(this));
    
    return router;
  }

  /**
   * Inicializa el formulario si no existe
   */
  async initializeForm(clientId: string, user: JWTPayload): Promise<CSEForm> {
    // Obtener el formulario actual o crear uno nuevo
    return await this.formManager.initialize({
      clientId,
      status: FormStatus.DRAFT,
      steps: initializeSteps(user.sub),
      createdBy: user.sub,
      createdAt: new Date().toISOString(),
      lastUpdatedBy: user.sub,
      lastUpdatedAt: new Date().toISOString(),
    });
  }

  /**
   * Obtiene el formulario completo
   */
  async getForm(): Promise<CSEForm> {
    const form = await this.formManager.get();
    if (!form) {
      throw new Error(ERROR_MESSAGES.FORM_NOT_FOUND);
    }
    return form;
  }
  
  /**
   * Maneja la solicitud para obtener el formulario
   */
  async handleGetForm(request: Request, params: RouteParams): Promise<Response> {
    const user = this.getUserFromRequest(request);
    const errorResponse = this.validateUser(user);
    if (errorResponse) return errorResponse;
    
    const clientId = params.clientId;
    await this.initializeForm(clientId, user!);
    const form = await this.getForm();
    
    return this.createResponse(form);
  }
  
  /**
   * Maneja la solicitud para enviar a revisión interna
   */
  async handleSubmitToInternalReview(request: Request, params: RouteParams): Promise<Response> {
    const user = this.getUserFromRequest(request);
    const errorResponse = this.validateUser(user);
    if (errorResponse) return errorResponse;
    
    const updatedForm = await this.updateFormStatus(FormStatus.PENDING_REVIEW_BY_INTERNAL_REVIEWER, user!);
    return this.createResponse(updatedForm);
  }
  
  /**
   * Maneja la solicitud para aprobar la revisión interna
   */
  async handleInternalReviewApprove(request: Request, params: RouteParams): Promise<Response> {
    const user = this.getUserFromRequest(request);
    const errorResponse = this.validateUser(user);
    if (errorResponse) return errorResponse;
    
    const updatedForm = await this.updateFormStatus(FormStatus.PENDING_REVIEW_BY_AUTHORITY_REVIEWER, user!);
    return this.createResponse(updatedForm);
  }
  
  /**
   * Maneja la solicitud para aprobar la revisión de autoridad
   */
  async handleAuthorityReviewApprove(request: Request, params: RouteParams): Promise<Response> {
    const user = this.getUserFromRequest(request);
    const errorResponse = this.validateUser(user);
    if (errorResponse) return errorResponse;
    
    const updatedForm = await this.updateFormStatus(FormStatus.APPROVED, user!);
    return this.createResponse(updatedForm);
  }
  
  /**
   * Maneja la solicitud para actualizar un paso
   */
  async handleUpdateStep(request: Request, params: RouteParams): Promise<Response> {
    const user = this.getUserFromRequest(request);
    const errorResponse = this.validateUser(user);
    if (errorResponse) return errorResponse;
    
    const stepId = params.stepId as StepId;
    
    // Verificar si el ID del paso es válido
    if (!FORM_STEPS.some(step => step.id === stepId)) {
      return this.createErrorResponse(`Paso ${stepId} no encontrado`, 404);
    }
    
    const requestData = await request.json() as { data: Record<string, any>, status?: StepStatus, needsCorrection?: boolean };
    const { data, status, needsCorrection } = requestData;
    
    try {
      const updatedForm = await this.updateStep(stepId, data, status, user!, needsCorrection);
      return this.createResponse(updatedForm);
    } catch (error) {
      return this.createErrorResponse((error as Error).message, 400);
    }
  }
  
  /**
   * Maneja la solicitud para solicitar correcciones desde revisión interna
   */
  async handleInternalReviewRequestCorrections(request: Request, params: RouteParams): Promise<Response> {
    const user = this.getUserFromRequest(request);
    const errorResponse = this.validateUser(user);
    if (errorResponse) return errorResponse;
    
    try {
      const { comments, stepsToCorrect } = await request.json() as { comments: any[], stepsToCorrect: StepId[] };
      const form = await this.getForm();
      
      // Marcar los pasos que necesitan corrección
      for (const stepId of stepsToCorrect) {
        const step = form.steps[stepId] as FormStep;
        if (step) {
          step.needsCorrection = true;
        }
      }
      
      // Añadir comentarios a los pasos correspondientes
      for (const comment of comments) {
        await this.addComment(comment.stepId, comment.text, user!);
      }
      
      // Guardar los cambios en los pasos antes de cambiar el estado
      await this.formManager.set(form);
      
      const updatedForm = await this.updateFormStatus(FormStatus.CORRECTIONS_NEEDED_BY_INTERNAL_REVIEWER, user!);
      return this.createResponse(updatedForm);
    } catch (error) {
      return this.createErrorResponse((error as Error).message, 400);
    }
  }
  
  /**
   * Maneja la solicitud para solicitar correcciones desde revisión de autoridad
   */
  async handleAuthorityReviewRequestCorrections(request: Request, params: RouteParams): Promise<Response> {
    const user = this.getUserFromRequest(request);
    const errorResponse = this.validateUser(user);
    if (errorResponse) return errorResponse;
    
    try {
      const { comments, stepsToCorrect } = await request.json() as { comments: any[], stepsToCorrect: StepId[] };
      const form = await this.getForm();
      
      // Marcar los pasos que necesitan corrección
      for (const stepId of stepsToCorrect) {
        const step = form.steps[stepId] as FormStep;
        if (step) {
          step.needsCorrection = true;
        }
      }
      
      // Añadir comentarios a los pasos correspondientes
      for (const comment of comments) {
        await this.addComment(comment.stepId, comment.text, user!);
      }
      
      // Guardar los cambios en los pasos antes de cambiar el estado
      await this.formManager.set(form);
      
      const updatedForm = await this.updateFormStatus(FormStatus.CORRECTIONS_NEEDED_BY_AUTHORITY_REVIEWER, user!);
      return this.createResponse(updatedForm);
    } catch (error) {
      return this.createErrorResponse((error as Error).message, 400);
    }
  }

  /**
   * Actualiza un paso del formulario
   * @param stepId - ID del paso a actualizar
   * @param data - Datos a actualizar en el paso
   * @param status - Nuevo estado del paso (opcional)
   * @param needsCorrection - Indica si el paso necesita corrección (opcional)
   * @param user - Información del usuario que realiza la actualización
   * @returns Formulario actualizado
   */
  async updateStep(
    stepId: StepId, 
    data: any, 
    status: StepStatus | undefined, 
    user: JWTPayload, 
    needsCorrection?: boolean
  ): Promise<CSEForm> {
    return await this.formManager.update(form => {
      const now = new Date().toISOString();
      
      // Verificar si el paso existe
      if (!form.steps[stepId]) {
        throw new Error(`Paso ${stepId} no encontrado`);
      }
      
      // Lógica para diferentes roles
      if (user.role === UserRole.CREATOR) {
        // Si el creador está corrigiendo, verificar que el paso esté marcado para corrección
        if (
          (form.status === FormStatus.CORRECTIONS_NEEDED_BY_INTERNAL_REVIEWER || 
           form.status === FormStatus.CORRECTIONS_NEEDED_BY_AUTHORITY_REVIEWER)
        ) {
          const step = form.steps[stepId] as FormStep;
          if (!step.needsCorrection) {
            throw new Error(`No tienes permiso para editar este paso. Solo puedes editar los pasos marcados para corrección.`);
          }
          // Al corregir un paso, se marca como que ya no necesita corrección
          needsCorrection = false;
        }
      } else if (
        (user.role === UserRole.INTERNAL_REVIEWER && form.status === FormStatus.PENDING_REVIEW_BY_INTERNAL_REVIEWER) ||
        (user.role === UserRole.AUTHORITY_REVIEWER && form.status === FormStatus.PENDING_REVIEW_BY_AUTHORITY_REVIEWER)
      ) {
        // Los revisores pueden marcar pasos para corrección durante su revisión
        // No modifican los datos, solo el estado y si necesita corrección
        data = {}; // Los revisores no modifican los datos del paso
      } else {
        throw new Error(`No tienes permiso para modificar este paso en el estado actual del formulario.`);
      }
      
      // Actualizar paso existente
      const currentStep = form.steps[stepId] as FormStep;
      form.steps[stepId] = {
        ...currentStep,
        data: { ...currentStep.data, ...data },
        status: status || currentStep.status,
        needsCorrection: needsCorrection !== undefined ? needsCorrection : currentStep.needsCorrection,
        lastUpdatedBy: user.sub,
        lastUpdatedAt: now,
      };
      
      // Si es el creador corrigiendo, verificamos si todos los pasos han sido corregidos
      if (user.role === UserRole.CREATOR && needsCorrection === false) {
        const allCorrectionsDone = Object.values(form.steps).every(step => !(step as FormStep).needsCorrection);
        
        // Si ya no hay pasos que necesiten corrección, podemos cambiar el estado del formulario
        if (allCorrectionsDone) {
          if (form.status === FormStatus.CORRECTIONS_NEEDED_BY_INTERNAL_REVIEWER) {
            form.status = FormStatus.PENDING_REVIEW_BY_INTERNAL_REVIEWER;
          } else if (form.status === FormStatus.CORRECTIONS_NEEDED_BY_AUTHORITY_REVIEWER) {
            form.status = FormStatus.PENDING_REVIEW_BY_INTERNAL_REVIEWER;
          }
        }
      }
      
      // Actualizar metadatos del formulario
      form.lastUpdatedBy = user.sub;
      form.lastUpdatedAt = now;
      
      return form;
    });
  }

  /**
   * Añade un comentario a un paso
   */
  async addComment(stepId: StepId, text: string, user: JWTPayload): Promise<CSEForm> {
    return await this.formManager.update(form => {
      const now = new Date().toISOString();
      
      // Verificar si el paso existe
      if (!form.steps[stepId]) {
        throw new Error(ERROR_MESSAGES.STEP_NOT_FOUND);
      }
      
      // Crear el comentario
      const commentId = crypto.randomUUID();
      const comment = {
        id: commentId,
        stepId,
        text,
        createdBy: user.sub,
        createdAt: now,
        role: user.role,
      };
      
      // Añadir el comentario al paso
      const step = form.steps[stepId] as FormStep;
      step.comments.push(comment);
      
      // Actualizar metadatos del formulario
      form.lastUpdatedBy = user.sub;
      form.lastUpdatedAt = now;
      
      return form;
    });
  }

  /**
   * Actualiza el estado del formulario
   */
  async updateFormStatus(newStatus: FormStatus, user: JWTPayload): Promise<CSEForm> {
    const form = await this.formManager.update(form => {
      const now = new Date().toISOString();
      
      // Verificar si la transición de estado es válida
      if (!isValidStatusTransition(form.status, newStatus)) {
        throw new Error(ERROR_MESSAGES.INVALID_STATUS_TRANSITION);
      }
      
      // Guardar el estado anterior para comparar después
      const oldStatus = form.status;
      
      // Actualizar el estado
      form.status = newStatus;
      form.lastUpdatedBy = user.sub;
      form.lastUpdatedAt = now;
      
      // Si el estado es APPROVED, registrar quién lo aprobó y cuándo
      if (newStatus === FormStatus.APPROVED) {
        form.approvedBy = user.sub;
        form.approvedAt = now;
      }
      
      return form;
    });
    
    // Actualizar el índice global si el estado ha cambiado
    try {
      // Verificar si tenemos acceso al env
      if (this.env && this.env.CSE_INDEX_DO) {
        const formId = `${form.clientId}`;
        const indexId = this.env.CSE_INDEX_DO.idFromName('global-index');
        const indexStub = this.env.CSE_INDEX_DO.get(indexId);
        
        // Notificar al índice sobre el cambio de estado
        await indexStub.fetch(new Request(INTERNAL_URLS.INDEX.UPDATE, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-User': JSON.stringify(user) // Pasar la información del usuario para autenticación
          },
          body: JSON.stringify({
            formId,
            formData: {
              clientId: form.clientId,
              status: form.status,
              lastUpdatedAt: form.lastUpdatedAt,
              createdBy: form.createdBy,
              steps: form.steps // Incluir los pasos para extraer información adicional
            }
          })
        }));
      }
    } catch (error) {
      console.error('Error updating index:', error);
      // No fallamos la operación principal si hay un error al actualizar el índice
    }
    
    return form;
  }

  /**
   * Maneja solicitudes HTTP al Durable Object
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const clientId = url.pathname.split('/')[1]; // Formato: /:clientId/...
    
    try {
      // Extraer el usuario del contexto (debe ser configurado por el middleware de autenticación)
      const user = this.getUserFromRequest(request);
      const errorResponse = this.validateUser(user);
      if (errorResponse) return errorResponse;
      
      // Inicializar el formulario si es necesario
      await this.initializeForm(clientId, user!);
      
      // Buscar una ruta que coincida usando el router
      const match = this.router.match(request.method, url.pathname);
      
      if (match) {
        return match.handler.handler(request, match.params);
      }
      
      // Ruta no encontrada
      return this.createErrorResponse('Ruta no encontrada', 404);
    } catch (error) {
      console.error('Error handling request:', error);
      return this.createErrorResponse((error as Error).message, 500);
    }
  }

  // Los métodos getUserFromRequest y validateUser ya están definidos en la clase base BaseDurableObject
}
