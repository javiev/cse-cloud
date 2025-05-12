import { CSEForm, FormStatus, JWTPayload, StepStatus } from '../types';
import { StepId, createStep, initializeSteps, FORM_STEPS, FormStep } from '../types/form-steps';
import { ERROR_MESSAGES } from '../constants';
import { isValidStatusTransition } from '../auth/authorization';

/**
 * Durable Object para almacenar el estado de un formulario CSE por cliente
 * Cada cliente tiene su propio Durable Object con ID: cse-${clientId}
 */
export class CSEDurableObject {
  state: DurableObjectState;
  form: CSEForm | null = null;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  /**
   * Inicializa el formulario si no existe
   */
  async initializeForm(clientId: string, user: JWTPayload): Promise<CSEForm> {
    // Verificar si ya existe un formulario
    const existingForm = await this.state.storage.get<CSEForm>('form');
    
    if (existingForm) {
      this.form = existingForm;
      return existingForm;
    }
    
    // Crear un nuevo formulario
    const now = new Date().toISOString();
    
    // Inicializar los pasos con valores predeterminados usando la función auxiliar
    const steps = initializeSteps(user.sub);
    
    const newForm: CSEForm = {
      clientId,
      status: FormStatus.DRAFT,
      steps,
      createdBy: user.sub,
      createdAt: now,
      lastUpdatedBy: user.sub,
      lastUpdatedAt: now,
    };
    
    // Guardar en el almacenamiento del Durable Object
    await this.state.storage.put('form', newForm);
    this.form = newForm;
    
    return newForm;
  }

  /**
   * Obtiene el formulario completo
   */
  async getForm(): Promise<CSEForm> {
    if (!this.form) {
      this.form = await this.state.storage.get<CSEForm>('form');
      
      if (!this.form) {
        throw new Error(ERROR_MESSAGES.FORM_NOT_FOUND);
      }
    }
    
    return this.form;
  }

  /**
   * Actualiza un paso del formulario
   */
  async updateStep(stepId: StepId, data: any, status: StepStatus | undefined, user: JWTPayload): Promise<CSEForm> {
    const form = await this.getForm();
    const now = new Date().toISOString();
    
    // Verificar si el paso existe
    if (!form.steps[stepId]) {
      throw new Error(`Paso ${stepId} no encontrado`);
    }
    
    // Actualizar paso existente
    const currentStep = form.steps[stepId] as FormStep;
    form.steps[stepId] = {
      ...currentStep,
      data: { ...currentStep.data, ...data },
      status: status || currentStep.status,
      lastUpdatedBy: user.sub,
      lastUpdatedAt: now,
    };
    
    // Actualizar el formulario
    form.lastUpdatedBy = user.sub;
    form.lastUpdatedAt = now;
    
    // Guardar cambios
    await this.state.storage.put('form', form);
    this.form = form;
    
    return form;
  }

  /**
   * Añade un comentario a un paso
   */
  async addComment(stepId: StepId, text: string, user: JWTPayload): Promise<CSEForm> {
    const form = await this.getForm();
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
    
    // Actualizar el formulario
    form.lastUpdatedBy = user.sub;
    form.lastUpdatedAt = now;
    
    // Guardar cambios
    await this.state.storage.put('form', form);
    this.form = form;
    
    return form;
  }

  /**
   * Actualiza el estado del formulario
   */
  async updateFormStatus(newStatus: FormStatus, user: JWTPayload): Promise<CSEForm> {
    const form = await this.getForm();
    const now = new Date().toISOString();
    
    // Verificar si la transición de estado es válida
    if (!isValidStatusTransition(form.status, newStatus)) {
      throw new Error(ERROR_MESSAGES.INVALID_STATUS_TRANSITION);
    }
    
    // Actualizar el estado
    form.status = newStatus;
    form.lastUpdatedBy = user.sub;
    form.lastUpdatedAt = now;
    
    // Si el estado es APPROVED, registrar quién lo aprobó y cuándo
    if (newStatus === FormStatus.APPROVED) {
      form.approvedBy = user.sub;
      form.approvedAt = now;
    }
    
    // Guardar cambios
    await this.state.storage.put('form', form);
    this.form = form;
    
    return form;
  }

  /**
   * Maneja solicitudes HTTP al Durable Object
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const clientId = url.pathname.split('/')[1]; // Formato: /:clientId/...
    
    // Extraer el usuario del contexto (debe ser configurado por el middleware de autenticación)
    const user = request.headers.get('X-User');
    if (!user) {
      return new Response(JSON.stringify({ error: ERROR_MESSAGES.UNAUTHORIZED }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const userData: JWTPayload = JSON.parse(user);
    
    try {
      // Inicializar el formulario si es necesario
      await this.initializeForm(clientId, userData);
      
      // Manejar diferentes rutas
      if (url.pathname === `/${clientId}`) {
        // GET /:clientId - Obtener formulario completo
        if (request.method === 'GET') {
          const form = await this.getForm();
          return new Response(JSON.stringify(form), {
            headers: { 'Content-Type': 'application/json' },
          });
        }
      } else if (url.pathname.startsWith(`/${clientId}/steps/`)) {
        // POST /:clientId/steps/:stepId - Actualizar un paso
        if (request.method === 'POST') {
          const stepIdStr = url.pathname.split('/')[3] as StepId;
          
          // Verificar si el ID del paso es válido
          if (!FORM_STEPS.some(step => step.id === stepIdStr)) {
            return new Response(JSON.stringify({ error: `Paso ${stepIdStr} no encontrado` }), {
              status: 404,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          
          const stepId = stepIdStr;
          
          const { data, status } = await request.json();
          
          const updatedForm = await this.updateStep(stepId, data, status, userData);
          return new Response(JSON.stringify(updatedForm), {
            headers: { 'Content-Type': 'application/json' },
          });
        }
      } else if (url.pathname === `/${clientId}/submit`) {
        // POST /:clientId/submit - Enviar a revisión interna
        if (request.method === 'POST') {
          const updatedForm = await this.updateFormStatus(FormStatus.PENDING_REVIEW_BY_INTERNAL_REVIEWER, userData);
          return new Response(JSON.stringify(updatedForm), {
            headers: { 'Content-Type': 'application/json' },
          });
        }
      } else if (url.pathname === `/${clientId}/internal-review/approve`) {
        // POST /:clientId/internal-review/approve - Aprobar internamente
        if (request.method === 'POST') {
          const updatedForm = await this.updateFormStatus(FormStatus.PENDING_REVIEW_BY_AUTHORITY_REVIEWER, userData);
          return new Response(JSON.stringify(updatedForm), {
            headers: { 'Content-Type': 'application/json' },
          });
        }
      } else if (url.pathname === `/${clientId}/internal-review/request-corrections`) {
        // POST /:clientId/internal-review/request-corrections - Solicitar correcciones internas
        if (request.method === 'POST') {
          const { comments } = await request.json();
          
          // Añadir comentarios a los pasos correspondientes
          for (const comment of comments) {
            await this.addComment(comment.stepId, comment.text, userData);
          }
          
          const updatedForm = await this.updateFormStatus(FormStatus.CORRECTIONS_NEEDED_BY_INTERNAL_REVIEWER, userData);
          return new Response(JSON.stringify(updatedForm), {
            headers: { 'Content-Type': 'application/json' },
          });
        }
      } else if (url.pathname === `/${clientId}/authority-review/approve`) {
        // POST /:clientId/authority-review/approve - Aprobar final
        if (request.method === 'POST') {
          const updatedForm = await this.updateFormStatus(FormStatus.APPROVED, userData);
          return new Response(JSON.stringify(updatedForm), {
            headers: { 'Content-Type': 'application/json' },
          });
        }
      } else if (url.pathname === `/${clientId}/authority-review/request-corrections`) {
        // POST /:clientId/authority-review/request-corrections - Solicitar correcciones de autoridad
        if (request.method === 'POST') {
          const { comments } = await request.json();
          
          // Añadir comentarios a los pasos correspondientes
          for (const comment of comments) {
            await this.addComment(comment.stepId, comment.text, userData);
          }
          
          const updatedForm = await this.updateFormStatus(FormStatus.CORRECTIONS_NEEDED_BY_AUTHORITY_REVIEWER, userData);
          return new Response(JSON.stringify(updatedForm), {
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }
      
      // Ruta no encontrada
      return new Response(JSON.stringify({ error: 'Ruta no encontrada' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error en el Durable Object:', error);
      
      return new Response(
        JSON.stringify({ error: error instanceof Error ? error.message : ERROR_MESSAGES.INTERNAL_ERROR }),
        {
          status: error instanceof Error && error.message === ERROR_MESSAGES.FORM_NOT_FOUND ? 404 : 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }
}
