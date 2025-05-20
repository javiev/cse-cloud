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
    console.log('Iniciando middleware de autenticación...');
    
    // Obtener el token del header Authorization
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader) {
      console.error('No se proporcionó el header de autorización');
      return c.json({ 
        error: 'No autorizado',
        details: 'Token de autenticación no proporcionado' 
      }, 401);
    }
    
    if (!authHeader.startsWith('Bearer ')) {
      console.error('Formato de token inválido. Debe comenzar con "Bearer "');
      return c.json({ 
        error: 'No autorizado',
        details: 'Formato de token inválido. Debe comenzar con "Bearer "' 
      }, 401);
    }
    
    try {
      // Verificar el token
      console.log('Verificando token JWT...');
      const user = await verifyJWT(authHeader, c.env.SESSION_SECRET);
      
      // Validar que el token contenga los campos necesarios
      if (!user.id) {
        console.error('El token no contiene un ID de usuario');
        return c.json({ 
          error: 'No autorizado',
          details: 'El token no contiene un ID de usuario' 
        }, 401);
      }
      
      if (!user.rol) {
        console.error('El token no contiene un rol de usuario');
        return c.json({ 
          error: 'No autorizado',
          details: 'El token no contiene un rol de usuario' 
        }, 401);
      }
      
      if (!user.client_id) {
        console.error('El token no contiene un ID de cliente');
        return c.json({ 
          error: 'No autorizado',
          details: 'El token no contiene un ID de cliente' 
        }, 401);
      }
      
      console.log('Autenticación exitosa para el usuario:', {
        id: user.id,
        email: user.email,
        rol: user.rol,
        client_id: user.client_id
      });
      
      // Almacenar la información del usuario en el contexto para uso posterior
      c.set('user', user);
      
      // Continuar con el siguiente middleware o handler
      await next();
      
    } catch (error) {
      console.error('Error al verificar el token JWT:', error);
      
      let errorMessage = 'Error de autenticación';
      let statusCode = 401;
      
      if (error instanceof Error) {
        const errorStr = error.message.toLowerCase();
        
        if (errorStr.includes('firma') || errorStr.includes('jws') || errorStr.includes('signature')) {
          errorMessage = 'Firma del token inválida';
          console.error('Posible problema con el SESSION_SECRET');
        } else if (errorStr.includes('expirado') || errorStr.includes('expired')) {
          errorMessage = 'El token ha expirado';
        } else if (errorStr.includes('jwt') || errorStr.includes('token')) {
          errorMessage = 'Token JWT inválido';
        } else {
          // Para otros errores, mantener el mensaje genérico
          errorMessage = 'Error al procesar el token de autenticación';
        }
      }
      
      return c.json({ 
        error: 'No autorizado',
        details: errorMessage 
      }, statusCode);
    }
    
  } catch (error) {
    console.error('Error inesperado en el middleware de autenticación:', error);
    return c.json({ 
      error: 'Error interno del servidor',
      details: 'Ocurrió un error inesperado al procesar la autenticación' 
    }, 500);
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
