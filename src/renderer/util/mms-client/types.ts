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

export interface CustomFileAnnotationRequest {
    annotationId: number;
    channelId?: number;
    fovId?: number;
    positionIndex?: number;
    scene?: number;
    subImageName?: string;
    timePointId?: number;
    values: string[];
}

export interface CreateFileMetadataRequest {
    customMetadata: {
        annotations: CustomFileAnnotationRequest[],
        templateId?: string;
    };
}
