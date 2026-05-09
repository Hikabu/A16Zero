/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type JobResponseDto = {
    id: string;
    title: string;
    description: string;
    /**
     * Job status
     */
    status: JobResponseDto.status;
    companyId: string;
    roleType: JobResponseDto.roleType;
    seniorityLevel: JobResponseDto.seniorityLevel;
    isWeb3Role: boolean;
    createdAt: string;
    updatedAt: string;
};
export namespace JobResponseDto {
    /**
     * Job status
     */
    export enum status {
        DRAFT = 'DRAFT',
        PENDING_PAYMENT = 'PENDING_PAYMENT',
        ACTIVE = 'ACTIVE',
        CLOSED_PENDING = 'CLOSED_PENDING',
        CLOSED = 'CLOSED',
    }
    export enum roleType {
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
    export enum seniorityLevel {
        JUNIOR = 'JUNIOR',
        MID = 'MID',
        SENIOR = 'SENIOR',
        LEAD = 'LEAD',
    }
}

