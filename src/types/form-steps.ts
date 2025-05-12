import { UserRole } from './index';
import { z } from 'zod';

/**
 * Definición flexible de los pasos del formulario CSE con esquemas Zod
 * Lista para ser compartida entre frontend y backend
 */

/**
 * Estados posibles para los pasos del formulario
 */
export enum StepStatus {
  INCOMPLETE = "incomplete",
  IN_PROGRESS = "in-progress",
  COMPLETED = "completed",
  REJECTED = "rejected"
}

/**
 * Identificadores únicos para cada paso del formulario
 */
export const STEP_ID = {
  INFORMACION: "informacion",
  MUROS: "muros",
  SECTORES: "sectores",
  PERFILES: "perfiles",
  DRENAJES: "drenajes",
  PLANOS_MAPAS: "planos_mapas",
  LISTA_APLICABILIDAD: "lista_aplicabilidad"
} as const;

/**
 * Tipo para los IDs de los pasos
 */
export type StepId = typeof STEP_ID[keyof typeof STEP_ID];

/**
 * Estructura de un comentario en un paso del formulario
 */
export interface StepComment {
  id: string;
  stepId: string;
  text: string;
  createdBy: string;
  createdAt: string;
  role: UserRole;
}

/**
 * Orden de los pasos en el formulario
 */
export const STEP_ORDER: StepId[] = [
  STEP_ID.INFORMACION,
  STEP_ID.MUROS,
  STEP_ID.SECTORES,
  STEP_ID.PERFILES,
  STEP_ID.DRENAJES,
  STEP_ID.PLANOS_MAPAS,
  STEP_ID.LISTA_APLICABILIDAD
];

/**
 * Esquemas Zod para validación de datos en cada paso
 */
export const STEP_SCHEMAS = {
  [STEP_ID.INFORMACION]: z.object({
    nombre: z.string().optional(),
    codigo: z.string().optional(),
    cliente: z.string().optional(),
    ubicacion: z.string().optional(),
    fechaInicio: z.string().optional(),
    responsable: z.string().optional(),
    email: z.string().optional(),
    telefono: z.string().optional()
  }).passthrough(),
  
  [STEP_ID.MUROS]: z.object({
    muros: z.array(z.object({
      id: z.string().uuid("ID inválido").optional(),
      nombre: z.string().min(1, "El nombre es requerido"),
      altura: z.number().positive("La altura debe ser positiva"),
      longitud: z.number().positive("La longitud debe ser positiva"),
      material: z.string().min(1, "El material es requerido"),
      observaciones: z.string().optional().default("")
    })).default([])
  }),
  
  [STEP_ID.SECTORES]: z.object({
    sectores: z.array(z.object({
      id: z.string().uuid("ID inválido").optional(),
      nombre: z.string().min(1, "El nombre es requerido"),
      area: z.number().positive("El área debe ser positiva"),
      descripcion: z.string().optional().default("")
    })).default([])
  }),
  
  [STEP_ID.PERFILES]: z.object({
    perfiles: z.array(z.object({
      id: z.string().uuid("ID inválido").optional(),
      nombre: z.string().min(1, "El nombre es requerido"),
      tipo: z.string().min(1, "El tipo es requerido"),
      longitud: z.number().positive("La longitud debe ser positiva"),
      observaciones: z.string().optional().default("")
    })).default([])
  }),
  
  [STEP_ID.DRENAJES]: z.object({
    drenajes: z.array(z.object({
      id: z.string().uuid("ID inválido").optional(),
      tipo: z.string().min(1, "El tipo es requerido"),
      ubicacion: z.string().min(1, "La ubicación es requerida"),
      capacidad: z.string().min(1, "La capacidad es requerida"),
      observaciones: z.string().optional().default("")
    })).default([])
  }),
  
  [STEP_ID.PLANOS_MAPAS]: z.object({
    documentos: z.array(z.object({
      id: z.string().uuid("ID inválido").optional(),
      nombre: z.string().min(1, "El nombre es requerido"),
      tipo: z.string().min(1, "El tipo es requerido"),
      url: z.string().url("URL inválida").optional(),
      fechaSubida: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)").optional(),
      version: z.string().optional().default("1.0")
    })).default([])
  }),
  
  [STEP_ID.LISTA_APLICABILIDAD]: z.object({
    items: z.array(z.object({
      id: z.string().uuid("ID inválido").optional(),
      norma: z.string().min(1, "La norma es requerida"),
      aplicable: z.boolean().default(false),
      justificacion: z.string().optional().default("")
    })).default([]),
    observacionesGenerales: z.string().optional().default("")
  })
};

/**
 * Tipos inferidos de los esquemas Zod para cada paso
 */
export type InformacionData = z.infer<typeof STEP_SCHEMAS[typeof STEP_ID.INFORMACION]>;
export type MurosData = z.infer<typeof STEP_SCHEMAS[typeof STEP_ID.MUROS]>;
export type SectoresData = z.infer<typeof STEP_SCHEMAS[typeof STEP_ID.SECTORES]>;
export type PerfilesData = z.infer<typeof STEP_SCHEMAS[typeof STEP_ID.PERFILES]>;
export type DrenajesData = z.infer<typeof STEP_SCHEMAS[typeof STEP_ID.DRENAJES]>;
export type PlanosMapasData = z.infer<typeof STEP_SCHEMAS[typeof STEP_ID.PLANOS_MAPAS]>;
export type ListaAplicabilidadData = z.infer<typeof STEP_SCHEMAS[typeof STEP_ID.LISTA_APLICABILIDAD]>;

/**
 * Tipo unión para todos los datos de pasos
 */
export type StepData =
  | InformacionData
  | MurosData
  | SectoresData
  | PerfilesData
  | DrenajesData
  | PlanosMapasData
  | ListaAplicabilidadData;

/**
 * Configuración de los pasos del formulario
 */
export const STEP_CONFIG = {
  [STEP_ID.INFORMACION]: {
    title: "Información",
    description: "Información general del proyecto",
    initialData: {}
  },
  [STEP_ID.MUROS]: {
    title: "Muros",
    description: "Información sobre muros",
    initialData: { muros: [] }
  },
  [STEP_ID.SECTORES]: {
    title: "Sectores",
    description: "Definición de sectores",
    initialData: { sectores: [] }
  },
  [STEP_ID.PERFILES]: {
    title: "Perfiles",
    description: "Perfiles del proyecto",
    initialData: { perfiles: [] }
  },
  [STEP_ID.DRENAJES]: {
    title: "Drenajes",
    description: "Sistema de drenajes",
    initialData: { drenajes: [] }
  },
  [STEP_ID.PLANOS_MAPAS]: {
    title: "Planos y Mapas",
    description: "Planos y mapas del proyecto",
    initialData: { documentos: [] }
  },
  [STEP_ID.LISTA_APLICABILIDAD]: {
    title: "Lista Aplicabilidad",
    description: "Lista de aplicabilidad",
    initialData: {
      items: [],
      observacionesGenerales: ""
    }
  }
};

/**
 * Arreglo de pasos con inicialización segura de datos
 */
export const FORM_STEPS = STEP_ORDER.map(id => ({
  id,
  ...STEP_CONFIG[id],
  initialData: () => STEP_CONFIG[id].initialData
}));

/**
 * Alias para compatibilidad con código existente
 */
export const STEP_IDS = STEP_ORDER;

/**
 * Interfaz para un paso del formulario
 */
export interface FormStep {
  id: StepId;
  title: string;
  description: string;
  status: StepStatus;
  data: StepData; // Ahora usamos el tipo StepData derivado de los esquemas Zod
  comments: StepComment[];
  lastUpdatedBy: string;
  lastUpdatedAt: string;
}

/**
 * Crea un nuevo paso del formulario con los datos iniciales
 * @param id Identificador del paso
 * @param user Usuario que crea el paso
 * @param partialData Datos parciales para inicializar el paso
 * @returns Paso del formulario inicializado
 */
export function createStep(
  id: StepId,
  user: string,
  partialData: Record<string, any> = {}
): FormStep {
  const config = STEP_CONFIG[id];
  const now = new Date().toISOString();
  
  return {
    id,
    title: config.title,
    description: config.description,
    status: StepStatus.INCOMPLETE,
    data: STEP_SCHEMAS[id].parse(partialData),
    comments: [],
    lastUpdatedBy: user,
    lastUpdatedAt: now
  };
}

// Función para obtener la definición de un paso por su ID
export function getStepDefinition(stepId: StepId) {
  return FORM_STEPS.find(step => step.id === stepId);
}

// Función para inicializar todos los pasos
export function initializeSteps(user: string): Record<StepId, FormStep> {
  const steps: Record<StepId, FormStep> = {} as Record<StepId, FormStep>;
  
  FORM_STEPS.forEach(step => {
    steps[step.id] = createStep(
      step.id,
      user,
      step.initialData()
    );
  });
  
  return steps;
}
