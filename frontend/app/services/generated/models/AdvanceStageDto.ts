/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type AdvanceStageDto = {
    /**
     * Next pipeline stage
     */
    stage: AdvanceStageDto.stage;
    /**
     * Optional HR note
     */
    note?: string;
};
export namespace AdvanceStageDto {
    /**
     * Next pipeline stage
     */
    export enum stage {
        APPLIED = 'APPLIED',
        REVIEWED = 'REVIEWED',
        SHORTLISTED = 'SHORTLISTED',
        INTERVIEW_HR = 'INTERVIEW_HR',
        INTERVIEW_TECHNICAL = 'INTERVIEW_TECHNICAL',
        INTERVIEW_FINAL = 'INTERVIEW_FINAL',
        OFFER = 'OFFER',
        HIRED = 'HIRED',
        REJECTED = 'REJECTED',
    }
}

