import { Context, Next } from 'hono';
import { verifyJWT } from '../auth/jwt';
import { CloudflareBindings } from '../types';

/**
 * Middleware para verificar la autenticación JWT
 * Extrae el token del header Authorization y lo verifica
 */
export async function authMiddleware(c: Context<{ Bindings: CloudflareBindings }>, next: Next) {
  try {
    // Obtener el token del header Authorization
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Token de autenticación no proporcionado' }, 401);
    }
    
    // Verificar el token
    const user = await verifyJWT(authHeader, c.env.SESSION_SECRET);
    
    // Almacenar la información del usuario en el contexto para uso posterior
    c.set('user', user);
    
    // Continuar con el siguiente middleware o handler
    await next();
  } catch (error) {
    console.error('Error de autenticación:', error);
    return c.json({ error: 'No autorizado' }, 401);
  }
}

/**
 * Middleware para verificar que el clientId en la URL coincide con el del token
 */
export async function clientIdMatchMiddleware(c: Context<{ Bindings: CloudflareBindings }>, next: Next) {
  try {
    const user = c.get('user');
    const urlClientId = c.req.param('clientId');
    
    if (!user || user.clientId !== urlClientId) {
      return c.json({ error: 'No autorizado para acceder a este cliente' }, 403);
    }
    
    await next();
  } catch (error) {
    console.error('Error de verificación de clientId:', error);
    return c.json({ error: 'Error al verificar permisos de cliente' }, 500);
  }
}
