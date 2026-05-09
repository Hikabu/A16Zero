/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type RevokeVouchDto = {
    /**
     * Wallet address of the original voucher
     */
    voucherWallet: string;
    /**
     * Signed message proving ownership. Must sign: "revoke-vouch:<vouchId>"
     */
    signedMessage: string;
};

