import { JWTPayload } from '../types';

/**
 * Clase base para todos los Durable Objects
 * Proporciona métodos comunes y utilidades
 */
export abstract class BaseDurableObject {
  state: DurableObjectState;
  env: any;
  
  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;
  }
  
  /**
   * Obtiene un valor del almacenamiento
   */
  protected async getStorage<T>(key: string, defaultValue?: T): Promise<T | undefined> {
    const value = await this.state.storage.get<T>(key);
    return value || defaultValue;
  }
  
  /**
   * Guarda un valor en el almacenamiento
   */
  protected async setStorage<T>(key: string, value: T): Promise<void> {
    await this.state.storage.put(key, value);
  }
  
  /**
   * Crea una respuesta JSON
   */
  protected createResponse(data: any, status = 200): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  /**
   * Crea una respuesta de error
   */
  protected createErrorResponse(message: string, status = 400): Response {
    return this.createResponse({ error: message }, status);
  }
  
  /**
   * Extrae el usuario de la solicitud
   */
  protected getUserFromRequest(request: Request): JWTPayload | null {
    const user = request.headers.get('X-User');
    return user ? JSON.parse(user) : null;
  }
  
  /**
   * Valida que exista un usuario en la solicitud
   */
  protected validateUser(user: JWTPayload | null): Response | null {
    if (!user) {
      return this.createErrorResponse('Unauthorized', 401);
    }
    return null;
  }
}
