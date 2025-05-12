import { Context } from 'hono';
import { CloudflareBindings, FormStatus } from '../types';
import { CLIENT_ROLES } from '../models';
import { INTERNAL_URLS } from '../constants/urls';

/**
 * Handler para listar formularios pendientes de revisión por autoridad
 * Solo autoridad_2 puede acceder a este endpoint
 */
export async function listPendingAuthorityReviews(c: Context<{ Bindings: CloudflareBindings }>) {
  const user = c.get('user');
  
  // Verificar que el usuario es autoridad_2
  if (user.rol !== CLIENT_ROLES.AUTORIDAD_2) {
    return c.json({ error: 'Forbidden. Only autoridad_2 can access this endpoint.' }, 403);
  }
  
  try {
    // Obtener el índice global
    const indexId = c.env.CSE_INDEX_DO.idFromName('global-index');
    const indexStub = c.env.CSE_INDEX_DO.get(indexId);
    
    // Consultar los formularios pendientes de revisión por autoridad
    const url = new URL(INTERNAL_URLS.INDEX.FORMS_BY_STATUS);
    url.searchParams.set('status', FormStatus.PENDING_REVIEW_BY_AUTHORITY_REVIEWER);
    
    const response = await indexStub.fetch(new Request(
      url.toString(),
      {
        headers: {
          'X-User': JSON.stringify(user)
        }
      }
    ));
    
    // Devolver la respuesta del índice
    const pendingForms = await response.json();
    return c.json(pendingForms);
  } catch (error) {
    console.error('Error fetching pending authority reviews:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

/**
 * Handler para obtener los detalles de un formulario específico
 * Solo autoridad_2 puede acceder a este endpoint
 */
export async function getFormDetails(c: Context<{ Bindings: CloudflareBindings }>) {
  const user = c.get('user');
  const clientId = c.req.param('clientId');
  
  // Verificar que el usuario es autoridad_2
  if (user.rol !== CLIENT_ROLES.AUTORIDAD_2) {
    return c.json({ error: 'Forbidden. Only autoridad_2 can access this endpoint.' }, 403);
  }
  
  try {
    // Obtener el Durable Object del formulario
    const formId = c.env.CSE_DO.idFromName(`cse-${clientId}`);
    const formDO = c.env.CSE_DO.get(formId);
    
    // Obtener el formulario
    const response = await formDO.fetch(new Request(INTERNAL_URLS.FORM.GET_FORM(clientId), {
      headers: {
        'X-User': JSON.stringify(user)
      }
    }));
    
    // Si el formulario no existe o hay otro error
    if (!response.ok) {
      const error = await response.json();
      return c.json({ error: error.error || 'Form not found' }, response.status);
    }
    
    // Devolver el formulario
    const form = await response.json();
    return c.json(form);
  } catch (error) {
    console.error(`Error fetching form details for client ${clientId}:`, error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}
