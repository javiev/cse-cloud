import { CloudflareBindings } from '../types';
import { generateDurableObjectName, generateStorageKey } from '../utils/durableObjects';

/**
 * Servicio para interactuar con los Durable Objects de clientes
 */
export class ClientService {
  private env: CloudflareBindings;
  
  constructor(env: CloudflareBindings) {
    this.env = env;
  }
  
  /**
   * Obtiene una instancia del Durable Object para un cliente específico
   * @param clientId - ID del cliente extraído del JWT
   * @returns Stub del Durable Object
   */
  async getClientDO(clientId: string) {
    // Generar el nombre del DO basado en el client_id
    const doName = generateDurableObjectName(clientId);
    
    // Obtener el ID del DO a partir del nombre
    const doId = this.env.CSE_DO.idFromName(doName);
    
    // Obtener el stub del DO
    return this.env.CSE_DO.get(doId);
  }
  
  /**
   * Almacena datos en el Durable Object de un cliente
   * @param clientId - ID del cliente extraído del JWT
   * @param type - Tipo de dato a almacenar
   * @param data - Datos a almacenar
   * @param id - Identificador único del recurso (opcional)
   */
  async storeData(clientId: string, type: string, data: any, id?: string) {
    const clientDO = await this.getClientDO(clientId);
    const key = generateStorageKey(clientId, type, id);
    
    // Enviar solicitud al DO para almacenar los datos
    const response = await clientDO.fetch(new Request(`https://do/store`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key,
        data,
      }),
    }));
    
    if (!response.ok) {
      throw new Error(`Error al almacenar datos: ${await response.text()}`);
    }
    
    return response.json();
  }
  
  /**
   * Recupera datos del Durable Object de un cliente
   * @param clientId - ID del cliente extraído del JWT
   * @param type - Tipo de dato a recuperar
   * @param id - Identificador único del recurso (opcional)
   */
  async getData(clientId: string, type: string, id?: string) {
    const clientDO = await this.getClientDO(clientId);
    const key = generateStorageKey(clientId, type, id);
    
    // Enviar solicitud al DO para recuperar los datos
    const response = await clientDO.fetch(new Request(`https://do/get?key=${encodeURIComponent(key)}`, {
      method: 'GET',
    }));
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Error al recuperar datos: ${await response.text()}`);
    }
    
    return response.json();
  }
  
  /**
   * Procesa una acción basada en el rol del usuario
   * @param clientId - ID del cliente extraído del JWT
   * @param rol - Rol del usuario extraído del JWT
   * @param action - Acción a realizar
   * @param data - Datos para la acción
   */
  async processAction(clientId: string, rol: string, action: string, data: any) {
    // No hardcodeamos los roles, usamos el rol que viene del JWT
    const clientDO = await this.getClientDO(clientId);
    
    // Enviar solicitud al DO para procesar la acción
    const response = await clientDO.fetch(new Request(`https://do/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientId,
        rol,
        action,
        data,
      }),
    }));
    
    if (!response.ok) {
      throw new Error(`Error al procesar acción: ${await response.text()}`);
    }
    
    return response.json();
  }
}
