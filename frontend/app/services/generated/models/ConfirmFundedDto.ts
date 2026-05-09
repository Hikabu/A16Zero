/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ConfirmFundedDto = {
    /**
     * Job post whose on-chain escrow was funded by the employer.
     */
    jobPostId: string;
    /**
     * Derived escrow PDA funded on-chain.
     */
    escrowAddress: string;
};

