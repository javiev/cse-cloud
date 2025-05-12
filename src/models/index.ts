import { z } from 'zod';
import { FormStatus, StepStatus, UserRole } from '../types';

// Esquema para validar el JWT payload
export const jwtPayloadSchema = z.object({
  sub: z.string(),
  role: z.nativeEnum(UserRole),
  clientId: z.string(),
  exp: z.number(),
  iat: z.number(),
});

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
