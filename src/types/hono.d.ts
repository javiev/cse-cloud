// Definir una interfaz simplificada para los datos del usuario que necesitamos
interface UserContext {
  client_id: string;
  rol: string;
}

// Extend Hono's ContextVariableMap interface to include our custom variables
declare module 'hono' {
  interface ContextVariableMap {
    user: UserContext;
  }
}
