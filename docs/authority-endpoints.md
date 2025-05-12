# Endpoints de Autoridad

Este documento detalla los endpoints específicos para usuarios con rol `autoridad_2` (authority_reviewer) que permiten listar y acceder a todos los formularios pendientes de revisión.

## Índice Global de Formularios

El sistema utiliza un Durable Object centralizado (`CSEIndexDurableObject`) que mantiene un índice de todos los formularios en el sistema, permitiendo consultas eficientes por estado sin necesidad de acceder a cada formulario individual.

## Endpoints Disponibles

### Listar Formularios Pendientes de Revisión

```
GET /api/authority/pending-forms
```

**Descripción:** Devuelve una lista de todos los formularios en estado `PENDING_REVIEW_BY_AUTHORITY_REVIEWER` de todos los clientes.

**Autenticación:** Requiere token JWT con rol `autoridad_2`.

**Respuesta Exitosa (200 OK):**
```json
{
  "forms": [
    {
      "clientId": "cliente-123",
      "status": "pending_review_by_authority_reviewer",
      "lastUpdatedAt": "2025-05-10T14:30:00Z",
      "createdBy": "minera_1@cliente-123.com"
    },
    {
      "clientId": "cliente-456",
      "status": "pending_review_by_authority_reviewer",
      "lastUpdatedAt": "2025-05-11T09:15:00Z",
      "createdBy": "minera_1@cliente-456.com"
    }
  ]
}
```

**Respuesta de Error (403 Forbidden):**
```json
{
  "error": "Forbidden. Only autoridad_2 can access this endpoint."
}
```

### Obtener Detalles de un Formulario Específico

```
GET /api/authority/forms/:clientId
```

**Descripción:** Obtiene los detalles completos de un formulario específico identificado por su `clientId`.

**Parámetros de Ruta:**
- `clientId`: Identificador único del cliente al que pertenece el formulario.

**Autenticación:** Requiere token JWT con rol `autoridad_2`.

**Respuesta Exitosa (200 OK):**
```json
{
  "clientId": "cliente-123",
  "status": "pending_review_by_authority_reviewer",
  "lastUpdatedAt": "2025-05-10T14:30:00Z",
  "createdBy": "minera_1@cliente-123.com",
  "steps": [
    {
      "id": "step1",
      "title": "Información General",
      "status": "completed",
      "data": { /* Datos del paso */ }
    },
    {
      "id": "step2",
      "title": "Configuración Técnica",
      "status": "completed",
      "data": { /* Datos del paso */ }
    }
  ]
}
```

**Respuesta de Error (403 Forbidden):**
```json
{
  "error": "Forbidden. Only autoridad_2 can access this endpoint."
}
```

**Respuesta de Error (404 Not Found):**
```json
{
  "error": "Form not found"
}
```

## Flujo de Trabajo para Autoridad

1. El usuario con rol `autoridad_2` accede al endpoint `/api/authority/pending-forms` para ver todos los formularios pendientes de revisión.
2. Selecciona un formulario específico y accede a sus detalles mediante `/api/authority/forms/:clientId`.
3. Revisa el formulario y decide:
   - Aprobar el formulario: `POST /cse/:clientId/authority-review/approve`
   - Solicitar correcciones: `POST /cse/:clientId/authority-review/request-corrections`

## Consideraciones de Seguridad

- Todos los endpoints están protegidos por autenticación JWT.
- Solo usuarios con rol `autoridad_2` pueden acceder a estos endpoints.
- Los usuarios con rol `autoridad_2` pueden acceder a formularios de cualquier cliente.
- Todas las operaciones se registran para auditoría.

## Configuración

Las URLs internas utilizadas para la comunicación entre Durable Objects se pueden configurar mediante variables de entorno:

```
INTERNAL_INDEX_BASE_URL=https://internal/index
INTERNAL_FORM_BASE_URL=https://internal/form
```

Estas variables se pueden definir en el archivo `.env` para desarrollo local o en `wrangler.jsonc` para despliegue.
