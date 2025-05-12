/**
 * Sistema simple de enrutamiento para Durable Objects
 */

export interface RouteParams {
  [key: string]: string;
}

export interface RouteHandler {
  method: string;
  pattern: string;
  handler: (request: Request, params: RouteParams) => Promise<Response>;
}

export class Router {
  private routes: RouteHandler[] = [];
  
  /**
   * Registra una ruta
   */
  register(method: string, pattern: string, handler: RouteHandler['handler']): void {
    this.routes.push({
      method,
      pattern,
      handler
    });
  }
  
  /**
   * Encuentra una ruta que coincida con el método y la ruta
   */
  match(method: string, path: string): { handler: RouteHandler, params: RouteParams } | null {
    for (const route of this.routes) {
      if (route.method !== method) continue;
      
      const params = this.matchPattern(route.pattern, path);
      if (params) {
        return { handler: route, params };
      }
    }
    
    return null;
  }
  
  /**
   * Verifica si un patrón coincide con una ruta y extrae los parámetros
   */
  private matchPattern(pattern: string, path: string): RouteParams | null {
    const patternParts = pattern.split('/').filter(Boolean);
    const pathParts = path.split('/').filter(Boolean);
    
    if (patternParts.length !== pathParts.length) {
      return null;
    }
    
    const params: RouteParams = {};
    
    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      const pathPart = pathParts[i];
      
      if (patternPart.startsWith(':')) {
        // Es un parámetro
        const paramName = patternPart.substring(1);
        params[paramName] = pathPart;
      } else if (patternPart !== pathPart) {
        // No coincide
        return null;
      }
    }
    
    return params;
  }
}
