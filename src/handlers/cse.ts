import { Context } from 'hono';
import { CloudflareBindings, FormStatus, JWTPayload } from '../types';
import { hasPermission } from '../auth/authorization';
import { ERROR_MESSAGES } from '../constants';
import { approveSchema, requestCorrectionsSchema, updateStepSchema } from '../models';
import { QueueEmulator } from '../utils/queue-emulator';

/**
 * Obtiene el Durable Object ID para un cliente específico
 */
function getCSEDurableObjectId(namespace: DurableObjectNamespace, clientId: string): DurableObjectId {
  return namespace.idFromName(`cse-${clientId}`);
}

/**
 * Obtiene el formulario CSE completo para un cliente
 */
export async function getCSEForm(c: Context<{ Bindings: CloudflareBindings }>) {
  const clientId = c.req.param('clientId');
  const user = c.get('user') as JWTPayload;
  
  // Obtener el Durable Object
  const id = getCSEDurableObjectId(c.env.CSE_DO, clientId);
  const stub = c.env.CSE_DO.get(id);
  
  // Añadir información del usuario al request
  const headers = new Headers();
  headers.set('X-User', JSON.stringify(user));
  
  // Hacer la solicitud al Durable Object
  const response = await stub.fetch(`https://cse-do/${clientId}`, {
    headers,
  });
  
  return response;
}

/**
 * Actualiza un paso del formulario CSE
 */
export async function updateCSEStep(c: Context<{ Bindings: CloudflareBindings }>) {
  const clientId = c.req.param('clientId');
  const stepId = c.req.param('stepId');
  const user = c.get('user') as JWTPayload;
  
  // Validar datos de entrada
  const body = await c.req.json();
  const validatedData = updateStepSchema.parse(body);
  
  // Obtener el formulario actual para verificar permisos
  const id = getCSEDurableObjectId(c.env.CSE_DO, clientId);
  const stub = c.env.CSE_DO.get(id);
  
  const formResponse = await stub.fetch(`https://cse-do/${clientId}`, {
    headers: { 'X-User': JSON.stringify(user) },
  });
  
  if (!formResponse.ok) {
    return formResponse;
  }
  
  const form = await formResponse.json();
  
  // Verificar permisos
  if (!hasPermission(user, 'edit', form.status, clientId)) {
    return c.json({ error: ERROR_MESSAGES.UNAUTHORIZED }, 403);
  }
  
  // Actualizar el paso
  const headers = new Headers();
  headers.set('X-User', JSON.stringify(user));
  headers.set('Content-Type', 'application/json');
  
  const response = await stub.fetch(`https://cse-do/${clientId}/steps/${stepId}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(validatedData),
  });
  
  return response;
}

/**
 * Envía el formulario a revisión interna
 */
export async function submitToInternalReview(c: Context<{ Bindings: CloudflareBindings }>) {
  const clientId = c.req.param('clientId');
  const user = c.get('user') as JWTPayload;
  
  // Verificar permisos
  if (!hasPermission(user, 'submitToInternalReview')) {
    return c.json({ error: ERROR_MESSAGES.UNAUTHORIZED }, 403);
  }
  
  // Obtener el Durable Object
  const id = getCSEDurableObjectId(c.env.CSE_DO, clientId);
  const stub = c.env.CSE_DO.get(id);
  
  // Añadir información del usuario al request
  const headers = new Headers();
  headers.set('X-User', JSON.stringify(user));
  
  // Hacer la solicitud al Durable Object
  const response = await stub.fetch(`https://cse-do/${clientId}/submit`, {
    method: 'POST',
    headers,
  });
  
  return response;
}

/**
 * Aprueba el formulario por el revisor interno
 */
export async function approveInternalReview(c: Context<{ Bindings: CloudflareBindings }>) {
  const clientId = c.req.param('clientId');
  const user = c.get('user') as JWTPayload;
  
  // Obtener el formulario actual para verificar permisos
  const id = getCSEDurableObjectId(c.env.CSE_DO, clientId);
  const stub = c.env.CSE_DO.get(id);
  
  const formResponse = await stub.fetch(`https://cse-do/${clientId}`, {
    headers: { 'X-User': JSON.stringify(user) },
  });
  
  if (!formResponse.ok) {
    return formResponse;
  }
  
  const form = await formResponse.json();
  
  // Verificar permisos
  if (!hasPermission(user, 'submitToAuthorityReview', form.status, clientId)) {
    return c.json({ error: ERROR_MESSAGES.UNAUTHORIZED }, 403);
  }
  
  // Aprobar internamente
  const headers = new Headers();
  headers.set('X-User', JSON.stringify(user));
  
  const response = await stub.fetch(`https://cse-do/${clientId}/internal-review/approve`, {
    method: 'POST',
    headers,
  });
  
  return response;
}

/**
 * Solicita correcciones por el revisor interno
 */
export async function requestInternalCorrections(c: Context<{ Bindings: CloudflareBindings }>) {
  const clientId = c.req.param('clientId');
  const user = c.get('user') as JWTPayload;
  
  // Validar datos de entrada
  const body = await c.req.json();
  const validatedData = requestCorrectionsSchema.parse(body);
  
  // Obtener el formulario actual para verificar permisos
  const id = getCSEDurableObjectId(c.env.CSE_DO, clientId);
  const stub = c.env.CSE_DO.get(id);
  
  const formResponse = await stub.fetch(`https://cse-do/${clientId}`, {
    headers: { 'X-User': JSON.stringify(user) },
  });
  
  if (!formResponse.ok) {
    return formResponse;
  }
  
  const form = await formResponse.json();
  
  // Verificar permisos
  if (!hasPermission(user, 'requestCorrections', form.status, clientId)) {
    return c.json({ error: ERROR_MESSAGES.UNAUTHORIZED }, 403);
  }
  
  // Solicitar correcciones
  const headers = new Headers();
  headers.set('X-User', JSON.stringify(user));
  headers.set('Content-Type', 'application/json');
  
  const response = await stub.fetch(`https://cse-do/${clientId}/internal-review/request-corrections`, {
    method: 'POST',
    headers,
    body: JSON.stringify(validatedData),
  });
  
  return response;
}

/**
 * Aprueba el formulario por la autoridad
 */
export async function approveAuthorityReview(c: Context<{ Bindings: CloudflareBindings }>) {
  const clientId = c.req.param('clientId');
  const user = c.get('user') as JWTPayload;
  
  // Validar datos de entrada (comentarios opcionales)
  const body = await c.req.json();
  const validatedData = approveSchema.parse(body);
  
  // Obtener el formulario actual para verificar permisos
  const id = getCSEDurableObjectId(c.env.CSE_DO, clientId);
  const stub = c.env.CSE_DO.get(id);
  
  const formResponse = await stub.fetch(`https://cse-do/${clientId}`, {
    headers: { 'X-User': JSON.stringify(user) },
  });
  
  if (!formResponse.ok) {
    return formResponse;
  }
  
  const form = await formResponse.json();
  
  // Verificar permisos
  if (!hasPermission(user, 'approve', form.status, clientId)) {
    return c.json({ error: ERROR_MESSAGES.UNAUTHORIZED }, 403);
  }
  
  // Si hay comentarios, añadirlos primero
  if (validatedData.comments && validatedData.comments.length > 0) {
    const headers = new Headers();
    headers.set('X-User', JSON.stringify(user));
    headers.set('Content-Type', 'application/json');
    
    for (const comment of validatedData.comments) {
      await stub.fetch(`https://cse-do/${clientId}/steps/${comment.stepId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          data: {}, 
          comment: comment.text 
        }),
      });
    }
  }
  
  // Aprobar por la autoridad
  const headers = new Headers();
  headers.set('X-User', JSON.stringify(user));
  
  const response = await stub.fetch(`https://cse-do/${clientId}/authority-review/approve`, {
    method: 'POST',
    headers,
  });
  
  // Si la aprobación fue exitosa, despachar a las colas
  if (response.ok) {
    const approvedForm = await response.json();
    
    // Crear el mensaje a enviar
    const message = {
      formId: `cse-${clientId}`,
      clientId,
      status: FormStatus.APPROVED,
      approvedBy: approvedForm.approvedBy,
      approvedAt: approvedForm.approvedAt,
      data: approvedForm,
    };
    
    try {
      // Despachar a la cola del cliente
      if (c.env.CLIENT_DISPATCH_QUEUE) {
        // Usar la cola real si está disponible
        await c.env.CLIENT_DISPATCH_QUEUE.send(message);
        console.log('Formulario despachado a la cola real del cliente');
      } else {
        // Usar el emulador de cola si la cola real no está disponible
        const clientQueueEmulator = new QueueEmulator('client-dispatch-queue');
        await clientQueueEmulator.send(message);
      }
      
      // Despachar a la cola de la autoridad
      if (c.env.AUTHORITY_DISPATCH_QUEUE) {
        // Usar la cola real si está disponible
        await c.env.AUTHORITY_DISPATCH_QUEUE.send(message);
        console.log('Formulario despachado a la cola real de la autoridad');
      } else {
        // Usar el emulador de cola si la cola real no está disponible
        const authorityQueueEmulator = new QueueEmulator('authority-dispatch-queue');
        await authorityQueueEmulator.send(message);
      }
    } catch (error) {
      // No fallar si hay errores al despachar
      console.error('Error al despachar el formulario:', error);
    }
  }
  
  return response;
}

/**
 * Solicita correcciones por la autoridad
 */
export async function requestAuthorityCorrections(c: Context<{ Bindings: CloudflareBindings }>) {
  const clientId = c.req.param('clientId');
  const user = c.get('user') as JWTPayload;
  
  // Validar datos de entrada
  const body = await c.req.json();
  const validatedData = requestCorrectionsSchema.parse(body);
  
  // Obtener el formulario actual para verificar permisos
  const id = getCSEDurableObjectId(c.env.CSE_DO, clientId);
  const stub = c.env.CSE_DO.get(id);
  
  const formResponse = await stub.fetch(`https://cse-do/${clientId}`, {
    headers: { 'X-User': JSON.stringify(user) },
  });
  
  if (!formResponse.ok) {
    return formResponse;
  }
  
  const form = await formResponse.json();
  
  // Verificar permisos
  if (!hasPermission(user, 'requestCorrections', form.status, clientId)) {
    return c.json({ error: ERROR_MESSAGES.UNAUTHORIZED }, 403);
  }
  
  // Solicitar correcciones
  const headers = new Headers();
  headers.set('X-User', JSON.stringify(user));
  headers.set('Content-Type', 'application/json');
  
  const response = await stub.fetch(`https://cse-do/${clientId}/authority-review/request-corrections`, {
    method: 'POST',
    headers,
    body: JSON.stringify(validatedData),
  });
  
  return response;
}
