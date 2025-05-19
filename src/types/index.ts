export interface CloudflareBindings {
  CSE_DO: DurableObjectNamespace;
  CSE_FILES: R2Bucket;
  CLIENT_DISPATCH_QUEUE?: Queue;
  AUTHORITY_DISPATCH_QUEUE?: Queue;
  ENVIRONMENT: string;
  SESSION_SECRET: string;
}

export interface JWTPayload {
  // Campos originales del token
  id: string;
  username: string;
  email: string;
  client_id: string;
  rol: string;
  exp: number;
  password?: string;
  _partial?: boolean;
  _saved_in_db?: boolean;
  _custom_generated_pk?: boolean;
  
  // Campos transformados para compatibilidad
  sub: string;       // Mapeado desde id
  role: UserRole;    // Mapeado desde rol
  clientId: string;  // Mapeado desde client_id
}

export enum UserRole {
  CREATOR = 'creator',
  INTERNAL_REVIEWER = 'internal_reviewer',
  AUTHORITY_REVIEWER = 'authority_reviewer',
}

export enum FormStatus {
  DRAFT = 'draft',
  PENDING_REVIEW_BY_INTERNAL_REVIEWER = 'pending_review_by_internal_reviewer',
  CORRECTIONS_NEEDED_BY_INTERNAL_REVIEWER = 'corrections_needed_by_internal_reviewer',
  PENDING_REVIEW_BY_AUTHORITY_REVIEWER = 'pending_review_by_authority_reviewer',
  CORRECTIONS_NEEDED_BY_AUTHORITY_REVIEWER = 'corrections_needed_by_authority_reviewer',
  APPROVED = 'approved',
}

export enum StepStatus {
  INCOMPLETE = 'incomplete',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
}

export interface FormStep {
  id: string;
  title: string;
  description: string;
  status: StepStatus;
  data: Record<string, any>;
  comments: StepComment[];
  needsCorrection: boolean; // Indica si el paso necesita corrección
  lastUpdatedBy: string;
  lastUpdatedAt: string;
}

export interface StepComment {
  id: string;
  stepId: string;
  comment: string;
  createdBy: string;
  createdAt: string;
  role: UserRole;
}

// Importamos los tipos específicos para los pasos
import { StepId } from './form-steps';

export interface CSEForm {
  clientId: string;
  status: FormStatus;
  steps: Record<StepId, FormStep>;
  createdBy: string;
  createdAt: string;
  lastUpdatedBy: string;
  lastUpdatedAt: string;
  approvedBy?: string;
  approvedAt?: string;
}
