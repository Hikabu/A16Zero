/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type VerifyMfaRecoveryDto = {
    /**
     * Internal User ID
     */
    userId: string;
    /**
     * 8-character recovery code
     */
    backupCode: string;
    /**
     * Temporary MFA session token
     */
    mfaToken: string;
};

