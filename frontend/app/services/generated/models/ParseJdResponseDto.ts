/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ParseJdResponseDto = {
    /**
     * AI parsed structured requirements
     */
    parsed: Record<string, any>;
    /**
     * Whether manual review is recommended
     */
    requiresReview: boolean;
    /**
     * Diff summary of extracted requirements
     */
    diff: Record<string, any>;
};

