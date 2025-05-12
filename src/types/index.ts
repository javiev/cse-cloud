export interface CloudflareBindings {
  CSE_DO: DurableObjectNamespace;
  CSE_FILES: R2Bucket;
  CLIENT_DISPATCH_QUEUE?: Queue;
  AUTHORITY_DISPATCH_QUEUE?: Queue;
  ENVIRONMENT: string;
  SENTRY_DSN: string;
  SESSION_SECRET: string;
}

export interface JWTPayload {
  sub: string;
  role: UserRole;
  clientId: string;
  exp: number;
  iat: number;
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
  COMPLETED = 'completed',
  NEEDS_CORRECTION = 'needs_correction',
}

export interface FormStep {
  id: string;
  title: string;
  description: string;
  status: StepStatus;
  data: Record<string, any>;
  comments: StepComment[];
  lastUpdatedBy: string;
  lastUpdatedAt: string;
}

export interface StepComment {
  id: string;
  stepId: string;
  text: string;
  createdBy: string;
  createdAt: string;
  role: UserRole;
}

// Importamos los tipos específicos para los pasos
import { AnyTypedFormStep, StepId } from './form-steps';

export interface CSEForm {
  clientId: string;
  status: FormStatus;
  steps: Record<StepId, AnyTypedFormStep>;
  createdBy: string;
  createdAt: string;
  lastUpdatedBy: string;
  lastUpdatedAt: string;
  approvedBy?: string;
  approvedAt?: string;
}
