/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type VouchResponseDto = {
    id: string;
    candidateId: string;
    voucherWallet: string;
    message: string;
    txSignature: string;
    /**
     * Quality weight of the voucher
     */
    weight: string;
    isActive: boolean;
    confirmedAt: string;
    expiresAt: string;
};

