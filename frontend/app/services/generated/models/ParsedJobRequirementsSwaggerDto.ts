/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ParsedJobRequirementsSwaggerDto = {
    /**
     * Technologies required for the role
     */
    requiredSkills: Array<string>;
    /**
     * Primary role type expected for the candidate
     */
    requiredRoleType: ParsedJobRequirementsSwaggerDto.requiredRoleType;
    /**
     * Expected seniority level
     */
    seniorityLevel: ParsedJobRequirementsSwaggerDto.seniorityLevel;
    /**
     * Importance of collaboration skills
     */
    collaborationWeight: ParsedJobRequirementsSwaggerDto.collaborationWeight;
    /**
     * Importance of ownership/autonomy
     */
    ownershipWeight: ParsedJobRequirementsSwaggerDto.ownershipWeight;
    /**
     * Importance of innovation and creativity
     */
    innovationWeight: ParsedJobRequirementsSwaggerDto.innovationWeight;
    /**
     * Whether this role is Web3-related
     */
    isWeb3Role: boolean;
    /**
     * Confidence score from the AI parser (0 to 1). Values below ~0.75 should be reviewed manually.
     */
    parserConfidence: number;
};
export namespace ParsedJobRequirementsSwaggerDto {
    /**
     * Primary role type expected for the candidate
     */
    export enum requiredRoleType {
        BACKEND = 'BACKEND',
        FRONTEND = 'FRONTEND',
        FULLSTACK = 'FULLSTACK',
        INFRASTRUCTURE = 'INFRASTRUCTURE',
        DATA_ML = 'DATA_ML',
        SMART_CONTRACT = 'SMART_CONTRACT',
        WEB3_BACKEND = 'WEB3_BACKEND',
        WEB3_FRONTEND = 'WEB3_FRONTEND',
        WEB3_FULLSTACK = 'WEB3_FULLSTACK',
        DEFI_PROTOCOL = 'DEFI_PROTOCOL',
        SECURITY_WEB3 = 'SECURITY_WEB3',
        SECURITY = 'SECURITY',
        GENERALIST = 'GENERALIST',
    }
    /**
     * Expected seniority level
     */
    export enum seniorityLevel {
        JUNIOR = 'JUNIOR',
        MID = 'MID',
        SENIOR = 'SENIOR',
        LEAD = 'LEAD',
    }
    /**
     * Importance of collaboration skills
     */
    export enum collaborationWeight {
        LOW = 'LOW',
        MEDIUM = 'MEDIUM',
        HIGH = 'HIGH',
    }
    /**
     * Importance of ownership/autonomy
     */
    export enum ownershipWeight {
        LOW = 'LOW',
        MEDIUM = 'MEDIUM',
        HIGH = 'HIGH',
    }
    /**
     * Importance of innovation and creativity
     */
    export enum innovationWeight {
        LOW = 'LOW',
        MEDIUM = 'MEDIUM',
        HIGH = 'HIGH',
    }
}

