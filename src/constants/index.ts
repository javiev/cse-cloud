import { FormStatus, StepStatus, UserRole } from '../types';

// Mapeo de roles a permisos
export const ROLE_PERMISSIONS = {
  [UserRole.CREATOR]: {
    canCreate: true,
    canEdit: [FormStatus.DRAFT, FormStatus.CORRECTIONS_NEEDED_BY_INTERNAL_REVIEWER, FormStatus.CORRECTIONS_NEEDED_BY_AUTHORITY_REVIEWER],
    canSubmitToInternalReview: true,
    canSubmitToAuthorityReview: false,
    canApprove: false,
    canRequestCorrections: false,
  },
  [UserRole.INTERNAL_REVIEWER]: {
    canCreate: false,
    canEdit: [],
    canSubmitToInternalReview: false,
    canSubmitToAuthorityReview: true,
    canApprove: false,
    canRequestCorrections: [FormStatus.PENDING_REVIEW_BY_INTERNAL_REVIEWER],
  },
  [UserRole.AUTHORITY_REVIEWER]: {
    canCreate: false,
    canEdit: [],
    canSubmitToInternalReview: false,
    canSubmitToAuthorityReview: false,
    canApprove: [FormStatus.PENDING_REVIEW_BY_AUTHORITY_REVIEWER],
    canRequestCorrections: [FormStatus.PENDING_REVIEW_BY_AUTHORITY_REVIEWER],
  },
};

// Mapeo de usuarios a roles (para desarrollo/pruebas)
export const USER_ROLES = {
  'minera_1': UserRole.CREATOR,
  'minera_3': UserRole.INTERNAL_REVIEWER,
  'autoridad_2': UserRole.AUTHORITY_REVIEWER,
};

// Transiciones de estado válidas
export const VALID_STATUS_TRANSITIONS = {
  [FormStatus.DRAFT]: [FormStatus.PENDING_REVIEW_BY_INTERNAL_REVIEWER],
  [FormStatus.PENDING_REVIEW_BY_INTERNAL_REVIEWER]: [
    FormStatus.CORRECTIONS_NEEDED_BY_INTERNAL_REVIEWER,
    FormStatus.PENDING_REVIEW_BY_AUTHORITY_REVIEWER,
  ],
  [FormStatus.CORRECTIONS_NEEDED_BY_INTERNAL_REVIEWER]: [FormStatus.PENDING_REVIEW_BY_INTERNAL_REVIEWER],
  [FormStatus.PENDING_REVIEW_BY_AUTHORITY_REVIEWER]: [
    FormStatus.CORRECTIONS_NEEDED_BY_AUTHORITY_REVIEWER,
    FormStatus.APPROVED,
  ],
  [FormStatus.CORRECTIONS_NEEDED_BY_AUTHORITY_REVIEWER]: [FormStatus.PENDING_REVIEW_BY_INTERNAL_REVIEWER],
  [FormStatus.APPROVED]: [],
};

// Nombres de colas para despacho
export const QUEUE_NAMES = {
  CLIENT_DISPATCH: 'client-dispatch-queue',
  AUTHORITY_DISPATCH: 'authority-dispatch-queue',
};

// Mensajes de error
export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'No autorizado para realizar esta acción',
  INVALID_STATUS_TRANSITION: 'Transición de estado no válida',
  FORM_NOT_FOUND: 'Formulario no encontrado',
  STEP_NOT_FOUND: 'Paso no encontrado',
  INVALID_INPUT: 'Datos de entrada no válidos',
  INTERNAL_ERROR: 'Error interno del servidor',
};
