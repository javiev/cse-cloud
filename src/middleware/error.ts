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
      // Mapear mensajes de error conocidos a códigos HTTP apropiados
      switch (error.message) {
        case ERROR_MESSAGES.UNAUTHORIZED:
          return c.json({ error: error.message }, 403);
        case ERROR_MESSAGES.FORM_NOT_FOUND:
        case ERROR_MESSAGES.STEP_NOT_FOUND:
          return c.json({ error: error.message }, 404);
        case ERROR_MESSAGES.INVALID_STATUS_TRANSITION:
        case ERROR_MESSAGES.INVALID_INPUT:
          return c.json({ error: error.message }, 400);
        default:
          // Enviar a Sentry u otro servicio de monitoreo si está configurado
          if (c.env.ENVIRONMENT !== 'dev') {
            // Aquí se integraría con Sentry
            console.error('Error no manejado:', error);
          }
          
          return c.json({ error: ERROR_MESSAGES.INTERNAL_ERROR }, 500);
      }
    }
    
    // Error genérico
    return c.json({ error: ERROR_MESSAGES.INTERNAL_ERROR }, 500);
  }
}
