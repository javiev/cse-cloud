/**
 * Utilidad para emular el comportamiento de Cloudflare Queues
 * cuando no están disponibles en el plan gratuito
 */

/**
 * Emula el envío de un mensaje a una cola
 * @param queueName Nombre de la cola
 * @param message Mensaje a enviar
 */
export async function emulateQueueSend(queueName: string, message: any): Promise<void> {
  // Formatear el mensaje para que sea más legible en los logs
  const formattedMessage = JSON.stringify(message, null, 2);
  
  console.log(`[QUEUE EMULATOR] Mensaje enviado a la cola "${queueName}":`);
  console.log(formattedMessage);
  
  // Aquí se podría implementar lógica adicional en el futuro
  // como guardar en R2, enviar a un webhook, etc.
  
  // Simular un pequeño retraso como lo haría una cola real
  await new Promise(resolve => setTimeout(resolve, 100));
  
  console.log(`[QUEUE EMULATOR] Mensaje procesado exitosamente para "${queueName}"`);
}

/**
 * Interfaz que emula la API de Cloudflare Queue
 */
export class QueueEmulator {
  private queueName: string;
  
  constructor(queueName: string) {
    this.queueName = queueName;
  }
  
  /**
   * Emula el método send de Cloudflare Queue
   */
  async send(message: any): Promise<void> {
    return emulateQueueSend(this.queueName, message);
  }
}
