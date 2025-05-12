import { Context, Next } from 'hono';
import { verifyJWT } from '../auth/jwt';
import { CloudflareBindings, UserRole } from '../types';
import { CLIENT_ROLES } from '../models';

/**
 * Middleware para verificar la autenticación JWT
 * Extrae el token del header Authorization y lo verifica
 * 
 * El JWT contiene:
 * - id: ID del usuario (mapeado a sub)
 * - username: Nombre del usuario
 * - email: Email del usuario
 * - client_id: ID del cliente
 * - rol: Rol del usuario (minera_1, minera_3, autoridad_2) - mapeado a role
 * - exp: Tiempo de expiración
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
    
    // Validar que el token contenga los campos necesarios
    if (!user.id || !user.rol || !user.client_id) {
      return c.json({ error: 'Token incompleto o mal formado' }, 401);
    }
    
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
 * o que el usuario tiene permisos para acceder a él según su rol
 */
export async function clientIdMatchMiddleware(c: Context<{ Bindings: CloudflareBindings }>, next: Next) {
  try {
    const user = c.get('user');
    const urlClientId = c.req.param('clientId');
    
    if (!user) {
      return c.json({ error: 'Usuario no autenticado' }, 401);
    }
    
    // Si el usuario es de la autoridad, puede acceder a cualquier cliente
    if (user.rol === CLIENT_ROLES.AUTORIDAD_2) {
      await next();
      return;
    }
    
    // Para otros roles (minera_1, minera_3), verificar que el client_id coincida con el de la URL
    if (user.client_id !== urlClientId) {
      return c.json({ error: 'No autorizado para acceder a este cliente' }, 403);
    }
    
    await next();
  } catch (error) {
    console.error('Error de verificación de clientId:', error);
    return c.json({ error: 'Error al verificar permisos de cliente' }, 500);
  }
}
