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

export type AnnotationRequest = CreateAnnotationRequest | { annotationId: number };

export interface SaveTemplateRequest {
    name: string;
    annotations: AnnotationRequest[];
}
