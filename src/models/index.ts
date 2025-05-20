import { z } from 'zod';
import { FormStatus, StepStatus, UserRole } from '../types';

// Esquema base con los campos requeridos
export const jwtPayloadSchema = z.object({
  // Campos requeridos
  id: z.union([z.string(), z.number()]).transform(String), // Acepta string o number y lo convierte a string
  email: z.string().email('Email inválido').min(1, 'El email es requerido'),
  exp: z.number().int('La fecha de expiración debe ser un timestamp'),
  
  // Campos opcionales con valores por defecto
  username: z.string().default(''),
  client_id: z.string().default(''),
  rol: z.string().default(''),
  password: z.string().optional(),
  _partial: z.any().optional(),
  _saved_in_db: z.any().optional(),
  _custom_generated_pk: z.any().optional(),
  
  // Permitir campos adicionales sin validación
}).passthrough()
  .transform(data => {
    try {
      // Extraer el rol correcto (puede venir en diferentes formatos)
      let roleName = data.rol;
      
      // Si no hay rol, intentar extraerlo de los datos del usuario
      if (!roleName && data.user) {
        try {
          const userData = typeof data.user === 'string' ? JSON.parse(data.user) : data.user;
          if (userData.roles && userData.roles[0]?.nombre) {
            roleName = userData.roles[0].nombre;
          }
        } catch (e) {
          console.error('Error al parsear user data:', e);
        }
      }
      
      // Mapear el rol a un UserRole válido
      const role = mapRolToUserRole(roleName || '');
      
      // Extraer client_id (puede venir en diferentes formatos)
      let clientId = data.client_id;
      if (!clientId && data.user) {
        try {
          const userData = typeof data.user === 'string' ? JSON.parse(data.user) : data.user;
          if (userData.client_id) {
            clientId = userData.client_id;
          }
        } catch (e) {
          console.error('Error al extraer client_id:', e);
        }
      }
      
      // Extraer username (puede venir en diferentes formatos)
      let username = data.username;
      if (!username && data.user) {
        try {
          const userData = typeof data.user === 'string' ? JSON.parse(data.user) : data.user;
          if (userData.username) {
            username = userData.username;
          }
        } catch (e) {
          console.error('Error al extraer username:', e);
        }
      }
      
      // Retornar la estructura esperada
      return {
        ...data,
        sub: data.id,
        role,
        clientId: clientId || data.client_id || '',
        // Mantener campos originales para compatibilidad
        id: data.id,
        username: username || data.email?.split('@')[0] || 'usuario',
        email: data.email,
        client_id: clientId || data.client_id || '',
        rol: roleName || '',
        exp: data.exp
      };
    } catch (error) {
      console.error('Error al transformar el payload JWT:', error);
      throw new Error('Error al procesar los datos de autenticación');
    }
  });

// Constantes para los roles de clientes
export const CLIENT_ROLES = {
  MINERA_1: 'minera_1',
  MINERA_3: 'minera_3',
  AUTORIDAD_2: 'autoridad_2'
} as const;

// Mapeo de roles de cliente a roles de usuario
const ROL_TO_USER_ROLE: Record<string, UserRole> = {
  [CLIENT_ROLES.MINERA_1]: UserRole.CREATOR,
  [CLIENT_ROLES.MINERA_3]: UserRole.INTERNAL_REVIEWER,
  [CLIENT_ROLES.AUTORIDAD_2]: UserRole.AUTHORITY_REVIEWER,
};

// Función para mapear el rol del token al enum UserRole
function mapRolToUserRole(rol: string): UserRole {
  if (!(rol in ROL_TO_USER_ROLE)) {
    throw new Error(`Rol inválido: ${rol}`);
  }
  return ROL_TO_USER_ROLE[rol];
}

// Esquema para validar un comentario de paso
export const stepCommentSchema = z.object({
  id: z.string().optional(),
  stepId: z.string(),
  comment: z.string().min(1, 'El comentario no puede estar vacío'),
  createdBy: z.string().optional(),
  createdAt: z.string().optional(),
  role: z.nativeEnum(UserRole).optional(),
});

// Esquema para validar un paso del formulario
export const formStepSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'El título no puede estar vacío'),
  description: z.string(),
  status: z.nativeEnum(StepStatus),
  data: z.record(z.any()),
  comments: z.array(stepCommentSchema).optional().default([]),
  lastUpdatedBy: z.string().optional(),
  lastUpdatedAt: z.string().optional(),
});

// Esquema para validar un formulario completo
export const cseFormSchema = z.object({
  clientId: z.string(),
  status: z.nativeEnum(FormStatus),
  steps: z.record(formStepSchema),
  createdBy: z.string(),
  createdAt: z.string(),
  lastUpdatedBy: z.string(),
  lastUpdatedAt: z.string(),
  approvedBy: z.string().optional(),
  approvedAt: z.string().optional(),
});

// Esquema para validar la actualización de un paso
export const updateStepSchema = z.object({
  data: z.record(z.any()),
  status: z.nativeEnum(StepStatus).optional(),
});

// Esquema para validar la solicitud de correcciones
export const requestCorrectionsSchema = z.object({
  comments: z.array(z.object({
    stepId: z.string(),
    comment: z.string().min(1, 'El comentario no puede estar vacío'),
  })),
});

// Esquema para validar la aprobación
export const approveSchema = z.object({
  comments: z.array(z.object({
    stepId: z.string(),
    comment: z.string(),
  })).optional(),
});
