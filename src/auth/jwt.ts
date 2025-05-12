import { jwtVerify } from 'jose';
import { JWTPayload } from '../types';
import { jwtPayloadSchema } from '../models';

/**
 * Verifica y decodifica un token JWT
 * @param token - Token JWT a verificar
 * @param secret - Secreto para verificar la firma
 * @returns Payload decodificado y validado
 */
export async function verifyJWT(token: string, secret: string): Promise<JWTPayload> {
  try {
    // Eliminar 'Bearer ' si está presente
    const cleanToken = token.startsWith('Bearer ') ? token.substring(7) : token;
    
    // Verificar el token con la librería jose
    const { payload } = await jwtVerify(
      cleanToken,
      new TextEncoder().encode(secret)
    );
    
    // Validar la estructura del payload con Zod
    const validatedPayload = jwtPayloadSchema.parse(payload);
    
    return validatedPayload;
  } catch (error) {
    console.error('Error al verificar JWT:', error);
    throw new Error('Token inválido o expirado');
  }
}
