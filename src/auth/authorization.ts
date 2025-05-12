import { FormStatus, JWTPayload, UserRole } from '../types';
import { ROLE_PERMISSIONS } from '../constants';

/**
 * Verifica si un usuario tiene permiso para realizar una acción específica
 * @param user - Información del usuario desde el JWT
 * @param action - Acción que se intenta realizar
 * @param formStatus - Estado actual del formulario (opcional)
 * @param formClientId - ID del cliente del formulario (opcional)
 * @returns Boolean indicando si el usuario tiene permiso
 */
export function hasPermission(
  user: JWTPayload,
  action: 'create' | 'edit' | 'submitToInternalReview' | 'submitToAuthorityReview' | 'approve' | 'requestCorrections',
  formStatus?: FormStatus,
  formClientId?: string
): boolean {
  // Verificar que el usuario pertenece al mismo cliente
  if (formClientId && user.clientId !== formClientId) {
    return false;
  }

  const permissions = ROLE_PERMISSIONS[user.role];
  
  if (!permissions) {
    return false;
  }

  // Objeto de mapeo para verificar permisos basados en la acción
  const permissionCheckers = {
    'create': () => !!permissions.canCreate,
    
    'edit': () => {
      if (!formStatus || !Array.isArray(permissions.canEdit)) {
        return false;
      }
      return permissions.canEdit.includes(formStatus);
    },
    
    'submitToInternalReview': () => !!permissions.canSubmitToInternalReview,
    
    'submitToAuthorityReview': () => !!permissions.canSubmitToAuthorityReview,
    
    'approve': () => {
      if (!formStatus || !Array.isArray(permissions.canApprove)) {
        return false;
      }
      return permissions.canApprove.includes(formStatus);
    },
    
    'requestCorrections': () => {
      if (!formStatus || !Array.isArray(permissions.canRequestCorrections)) {
        return false;
      }
      return permissions.canRequestCorrections.includes(formStatus);
    }
  };
  
  // Ejecutar el verificador correspondiente o devolver false si no existe
  return permissionCheckers[action]?.() || false;
}

/**
 * Verifica si la transición de estado es válida
 * @param currentStatus - Estado actual del formulario
 * @param newStatus - Nuevo estado del formulario
 * @returns Boolean indicando si la transición es válida
 */
export function isValidStatusTransition(currentStatus: FormStatus, newStatus: FormStatus): boolean {
  const validTransitions = {
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

  return validTransitions[currentStatus]?.includes(newStatus) || false;
}
