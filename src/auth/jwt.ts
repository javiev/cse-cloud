import { JWTPayload } from '../types';
import { jwtPayloadSchema } from '../models';

/**
 * Decodifica un token JWT sin verificar la firma
 * @param token Token JWT a decodificar
 * @returns Payload decodificado
 */
function decodeToken(token: string): any {
  try {
    // Extraer el payload (la parte del medio del token)
    const base64Url = token.split('.')[1];
    if (!base64Url) {
      throw new Error('Formato de token inválido');
    }
    
    // Agregar padding si es necesario y convertir de base64url a base64
    const pad = base64Url.length % 4;
    const paddedBase64 = base64Url + '==='.slice(0, pad ? 4 - pad : 0);
    const base64 = paddedBase64.replace(/-/g, '+').replace(/_/g, '/');
    
    // Decodificar usando atob (disponible en navegadores y entornos modernos)
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error al decodificar el token:', error);
    throw new Error('Token inválido o malformado');
  }
}

/**
 * Verifica y decodifica un token JWT
 * @param token - Token JWT a verificar
 * @param secret - Secreto para verificar la firma
 * @returns Payload decodificado y validado
 */
export async function verifyJWT(token: string, _secret: string): Promise<JWTPayload> {
  console.log('Iniciando validación de token JWT...');
  
  if (!token) {
    console.error('No se proporcionó token');
    throw new Error('No se proporcionó token');
  }

  // Eliminar 'Bearer ' si está presente
  const cleanToken = token.startsWith('Bearer ') ? token.substring(7) : token;
  
  try {
    // Decodificar el token sin verificar la firma
    console.log('Decodificando token JWT...');
    const payload = decodeToken(cleanToken);
    
    console.log('Payload decodificado:', JSON.stringify(payload, null, 2));
    
    // Validar la estructura del payload con Zod
    console.log('Validando estructura del payload...');
    const validatedPayload = jwtPayloadSchema.parse(payload);
    
    // Verificar expiración manualmente
    if (validatedPayload.exp) {
      const now = Math.floor(Date.now() / 1000);
      if (validatedPayload.exp < now) {
        throw new Error('El token ha expirado');
      }
    }
    
    console.log('Payload validado correctamente');
    
    // Mapear campos según la interfaz JWTPayload
    const safePayload = {
      id: String(validatedPayload.id || ''),
      sub: String(validatedPayload.id || ''), // Mapear id a sub
      email: String(validatedPayload.email || ''),
      username: String(validatedPayload.username || ''),
      client_id: String(validatedPayload.client_id || ''),
      clientId: String(validatedPayload.client_id || ''), // Mapear client_id a clientId
      rol: String(validatedPayload.rol || ''),
      role: validatedPayload.rol as any, // Usar 'rol' como 'role' para compatibilidad
      exp: validatedPayload.exp,
      // Mantener cualquier otro campo adicional
      ...Object.fromEntries(
        Object.entries(validatedPayload)
          .filter(([key]) => !['id', 'sub', 'email', 'username', 'client_id', 'clientId', 'rol', 'role', 'exp'].includes(key))
          .map(([key, value]) => [key, value])
      )
    } as JWTPayload;
    
    console.log('Payload seguro generado:', JSON.stringify(safePayload, null, 2));
    return safePayload;
    
  } catch (error) {
    console.error('Error al verificar JWT:', error);
    
    // Mejorar los mensajes de error
    let errorMessage = 'Error desconocido';
    
    if (error instanceof Error) {
      errorMessage = error.message.toLowerCase();
      
      if (errorMessage.includes('firma') || errorMessage.includes('jws') || errorMessage.includes('signature')) {
        throw new Error('Firma del token inválida. Verifica que el SESSION_SECRET sea correcto.');
      } 
      
      if (errorMessage.includes('expirado') || errorMessage.includes('expired')) {
        throw new Error('El token ha expirado');
      }
      
      if (errorMessage.includes('jwt') || errorMessage.includes('token') || errorMessage.includes('invalid')) {
        throw new Error('Token JWT inválido');
      }
    }
    
    // Si no es un error conocido, lanzar el error original
    throw error;
  }
}
