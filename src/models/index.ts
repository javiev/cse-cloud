import { z } from 'zod';
import { FormStatus, StepStatus, UserRole } from '../types';

// Esquema para validar el JWT payload
export const jwtPayloadSchema = z.object({
  // Campos del token real
  id: z.string(),
  username: z.string(),
  email: z.string().email(),
  client_id: z.string(),
  rol: z.string(),
  exp: z.number(),
  // Campos opcionales
  password: z.string().optional(),
  _partial: z.boolean().optional(),
  _saved_in_db: z.boolean().optional(),
  _custom_generated_pk: z.boolean().optional(),
}).transform(data => ({
  ...data,
  // Transformar a la estructura esperada por el código existente
  sub: data.id,
  role: mapRolToUserRole(data.rol),
  clientId: data.client_id
}));

// Constantes para los roles de clientes
export const CLIENT_ROLES = {
  MINERA_1: 'minera_1',
  MINERA_3: 'minera_3',
  AUTORIDAD_2: 'autoridad_2'
} as const;

// Función para mapear el rol del token al enum UserRole
function mapRolToUserRole(rol: string): UserRole {
  // Mapeo de roles según la documentación
  switch (rol) {
    case CLIENT_ROLES.MINERA_1:
      return UserRole.CREATOR;
    case CLIENT_ROLES.MINERA_3:
      return UserRole.INTERNAL_REVIEWER;
    case CLIENT_ROLES.AUTORIDAD_2:
      return UserRole.AUTHORITY_REVIEWER;
    default:
      return UserRole.CREATOR; // Valor por defecto
  }
}

// Esquema para validar un comentario de paso
export const stepCommentSchema = z.object({
  id: z.string().optional(),
  stepId: z.string(),
  text: z.string().min(1, 'El comentario no puede estar vacío'),
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
    text: z.string().min(1, 'El comentario no puede estar vacío'),
  })),
});

// Esquema para validar la aprobación
export const approveSchema = z.object({
  comments: z.array(z.object({
    stepId: z.string(),
    text: z.string(),
  })).optional(),
});
