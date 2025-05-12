# Arquitectura de Durable Objects

Este documento describe la arquitectura optimizada de los Durable Objects utilizados en CSE Cloud.

## Estructura General

La implementación de Durable Objects sigue un patrón de diseño modular que permite reducir la verbosidad del código y mejorar la mantenibilidad, manteniendo la misma funcionalidad y API pública.

```
┌─────────────────────────────────────┐
│         BaseDurableObject           │
│  (Métodos comunes y utilidades)     │
└───────────────┬─────────────────────┘
                │
                ├─────────────────────────┐
                │                         │
┌───────────────▼─────────────────┐      │
│     CSEDurableObject            │      │
│  (Formulario por cliente)       │      │
└───────────────────────────────┬─┘      │
                                │        │
                                │        │
┌───────────────────────────────▼┐      │
│       StateManager              │      │
│  (Gestión de estado)           │      │
└───────────────────────────────┬┘      │
                                │        │
                                │        │
┌───────────────────────────────▼┐      │
│          Router                 │      │
│  (Enrutamiento de peticiones)  │      │
└────────────────────────────────┘      │
                                         │
                                         │
┌─────────────────────────────────────┐  │
│      CSEIndexDurableObject          │◄─┘
│  (Índice global de formularios)     │
└─────────────────────────────────────┘
```

## Componentes Principales

### BaseDurableObject

Clase base abstracta que proporciona funcionalidad común para todos los Durable Objects:

- Métodos para acceso al almacenamiento
- Utilidades para crear respuestas HTTP
- Funciones de autenticación y validación

```typescript
export abstract class BaseDurableObject {
  protected async getStorage<T>(key: string, defaultValue?: T): Promise<T | undefined>;
  protected async setStorage<T>(key: string, value: T): Promise<void>;
  protected createResponse(data: any, status?: number): Response;
  protected createErrorResponse(message: string, status?: number): Response;
  protected getUserFromRequest(request: Request): JWTPayload | null;
  protected validateUser(user: JWTPayload | null): Response | null;
}
```

### StateManager

Clase utilitaria para gestionar el estado de un Durable Object de manera más eficiente:

- Caché en memoria para reducir lecturas a almacenamiento
- Patrón de actualización funcional para modificaciones de estado
- Inicialización automática de valores por defecto

```typescript
export class StateManager<T> {
  async get(): Promise<T | null>;
  async update(updater: (data: T) => T): Promise<T>;
  async set(value: T): Promise<void>;
  async initialize(defaultValue: T): Promise<T>;
}
```

### Router

Sistema de enrutamiento para simplificar el manejo de solicitudes HTTP:

- Definición declarativa de rutas
- Extracción automática de parámetros de URL
- Simplificación del método `fetch` principal

```typescript
export class Router {
  register(method: string, pattern: string, handler: RouteHandler['handler']): void;
  match(method: string, path: string): { handler: RouteHandler, params: RouteParams } | null;
}
```

### CSEDurableObject

Implementación específica para gestionar formularios CSE por cliente:

- Utiliza `StateManager` para gestión eficiente del estado
- Implementa el patrón de controlador con `Router`
- Mantiene la misma API y lógica de negocio que la versión original

### CSEIndexDurableObject

Implementación específica para el índice global de formularios:

- Utiliza la misma arquitectura modular
- Mantiene un índice centralizado de todos los formularios
- Permite consultas eficientes por estado a nivel global

## Flujo de Ejecución

1. Una solicitud HTTP llega al Worker
2. El Worker determina a qué Durable Object debe dirigir la solicitud
3. El método `fetch` del Durable Object recibe la solicitud
4. El `Router` determina qué controlador debe manejar la solicitud
5. El controlador utiliza `StateManager` para leer y actualizar el estado
6. Se devuelve una respuesta HTTP al cliente

## Beneficios de la Arquitectura

- **Reducción de código repetitivo**: Las clases base y helpers eliminan código duplicado
- **Mejor organización**: Separación clara de responsabilidades
- **Mantenibilidad mejorada**: Cambios en un solo lugar afectan a toda la aplicación
- **Código más legible**: Menos líneas de código para lograr la misma funcionalidad
- **Facilidad para testing**: Componentes más pequeños y aislados

## API Pública

La API pública de los Durable Objects se mantiene exactamente igual que en la versión original, asegurando compatibilidad completa con el código existente.

## Matriz de Acceso

Se mantiene la misma matriz de acceso detallada que define los permisos de cada rol según el estado del formulario:

| Estado del Formulario            | creator         | internal_reviewer | authority_reviewer |
|----------------------------------|------------------|--------------------|---------------------|
| draft                            | Editar           | No acceso          | No acceso           |
| pending_review_by_internal       | Lectura          | Revisión completa  | No acceso           |
| corrections_needed_by_internal   | Corregir pasos   | Lectura            | No acceso           |
| pending_review_by_authority      | Lectura          | Lectura            | Revisión completa   |
| corrections_needed_by_authority  | Corregir pasos   | Lectura            | Lectura             |
| approved                         | Lectura          | Lectura            | Lectura             |
