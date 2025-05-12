/**
 * Utilidades para trabajar con Durable Objects
 */

/**
 * Genera el nombre de un Durable Object basado en el ID del cliente
 * @param clientId - ID del cliente extraído del JWT
 * @returns Nombre del Durable Object
 */
export function generateDurableObjectName(clientId: string): string {
  return `client-${clientId}`;
}

/**
 * Genera la clave para almacenar datos en un Durable Object
 * @param clientId - ID del cliente extraído del JWT
 * @param type - Tipo de dato (ej: 'form', 'user', etc.)
 * @param id - Identificador único del recurso (opcional)
 * @returns Clave para almacenamiento en DO
 */
export function generateStorageKey(clientId: string, type: string, id?: string): string {
  return id ? `${clientId}:${type}:${id}` : `${clientId}:${type}`;
}
