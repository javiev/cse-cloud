import { Context, Next } from 'hono';
import { ZodError } from 'zod';
import { CloudflareBindings } from '../types';
import { ERROR_MESSAGES } from '../constants';

/**
 * Middleware para manejar errores de forma centralizada
 */
export async function errorMiddleware(c: Context<{ Bindings: CloudflareBindings }>, next: Next) {
  try {
    await next();
  } catch (error) {
    console.error('Error en la aplicación:', error);
    
    // Manejar diferentes tipos de errores
    if (error instanceof ZodError) {
      // Error de validación de datos con Zod
      return c.json({
        error: 'Error de validación',
        details: error.errors,
      }, 400);
    } else if (error instanceof Error) {
      // Mapeo de mensajes de error a códigos HTTP y manejadores
      const errorHandlers: Record<string, () => Response> = {
        // Errores de autorización (403)
        [ERROR_MESSAGES.UNAUTHORIZED]: () => c.json({ error: error.message }, 403),
        
        // Errores de recurso no encontrado (404)
        [ERROR_MESSAGES.FORM_NOT_FOUND]: () => c.json({ error: error.message }, 404),
        [ERROR_MESSAGES.STEP_NOT_FOUND]: () => c.json({ error: error.message }, 404),
        
        // Errores de validación o entrada inválida (400)
        [ERROR_MESSAGES.INVALID_STATUS_TRANSITION]: () => c.json({ error: error.message }, 400),
        [ERROR_MESSAGES.INVALID_INPUT]: () => c.json({ error: error.message }, 400),
      };
      
      // Ejecutar el manejador correspondiente o manejar como error interno
      const handler = errorHandlers[error.message];
      if (handler) {
        return handler();
      }
      
      // Manejador por defecto para errores no especificados
      if (c.env.ENVIRONMENT !== 'dev') {
        console.error('Error no manejado:', error);
      }
      
      return c.json({ error: ERROR_MESSAGES.INTERNAL_ERROR }, 500);
    }
    
    // Error genérico
    return c.json({ error: ERROR_MESSAGES.INTERNAL_ERROR }, 500);
  }
}
