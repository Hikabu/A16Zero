/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type VerifyMfaDto = {
    /**
     * Internal User ID
     */
    userId: string;
    /**
     * 6-digit MFA code
     */
    code: string;
    /**
     * Temporary MFA session token
     */
    mfaToken: string;
};

