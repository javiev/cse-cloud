/**
 * Clase para gestionar el estado de un Durable Object
 * Proporciona una interfaz simplificada para acceder y actualizar datos
 */
export class StateManager<T> {
  private state: DurableObjectState;
  private key: string;
  private cachedData: T | null = null;
  
  constructor(state: DurableObjectState, key: string) {
    this.state = state;
    this.key = key;
  }
  
  /**
   * Obtiene el valor actual del estado
   */
  async get(): Promise<T | null> {
    if (!this.cachedData) {
      const value = await this.state.storage.get<T>(this.key);
      this.cachedData = value || null;
    }
    return this.cachedData;
  }
  
  /**
   * Actualiza el estado usando una función de actualización
   */
  async update(updater: (data: T) => T): Promise<T> {
    const current = await this.get() as T;
    const updated = updater(current);
    await this.state.storage.put(this.key, updated);
    this.cachedData = updated;
    return updated;
  }
  
  /**
   * Establece directamente un nuevo valor para el estado
   */
  async set(value: T): Promise<void> {
    await this.state.storage.put(this.key, value);
    this.cachedData = value;
  }
  
  /**
   * Inicializa el estado con un valor predeterminado si no existe
   */
  async initialize(defaultValue: T): Promise<T> {
    const current = await this.get();
    if (!current) {
      await this.set(defaultValue);
      return defaultValue;
    }
    return current;
  }
}
