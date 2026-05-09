/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type LinkWalletRequestDto = {
    /**
     * Solana wallet public address (Base58 encoded)
     */
    walletAddress: string;
    /**
     * Base58 encoded signature of the challenge signed by the wallet private key
     */
    signature: string;
};

