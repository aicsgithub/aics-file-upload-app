import { CellPopulation, Solution } from "../../state/selection/types";

export interface CreateAnnotationRequest {
  annotationOptions?: string[];
  annotationTypeId: number;
  canHaveManyValues: boolean;
  description: string;
  name: string;
  lookupColumn?: string;
  lookupSchema?: string;
  lookupTable?: string;
  required: boolean;
}

export type AnnotationRequest =
  | CreateAnnotationRequest
  | { annotationId: number };

export interface SaveTemplateRequest {
  name: string;
  annotations: AnnotationRequest[];
}

export interface GetPlateResponse {
  plate: PlateResponse;
  wells: WellResponse[];
}

interface Audited {
  created: Date;
  createdBy: number;
  modifiedBy: number;
  modified: Date;
}

export interface PlateResponse extends Audited {
  barcode: string;
  comments: string;
  imagingSessionId?: number;
  plateGeometryId: number;
  plateId: number;
  plateStatusId: number;
  seededOn?: string; // Date string
}

export interface WellResponse {
  row: number;
  col: number;
  plateId: number;
  wellId: number;
  cellPopulations: CellPopulation[];
  solutions: Solution[];
}

export interface Template extends Audited {
  annotations: TemplateAnnotation[];
  name: string;
  templateId: number;
  version: number;
}

export interface TemplateAnnotation extends Audited {
  annotationId: number;
  annotationOptions?: string[];
  annotationTypeId: number;
  description: string;
  lookupSchema?: string;
  lookupTable?: string;
  name: string;
  required: boolean;
}
