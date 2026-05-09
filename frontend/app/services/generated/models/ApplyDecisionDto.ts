/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ApplyDecisionDto = {
    /**
     * The decision status for the application
     */
    status: ApplyDecisionDto.status;
};
export namespace ApplyDecisionDto {
    /**
     * The decision status for the application
     */
    export enum status {
        SHORTLISTED = 'SHORTLISTED',
        REJECTED = 'REJECTED',
        REVIEWED = 'REVIEWED',
    }
}

