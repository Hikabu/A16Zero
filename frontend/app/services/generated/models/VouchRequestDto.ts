/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { VouchDataDto } from './VouchDataDto';
export type VouchRequestDto = {
    /**
     * Voucher wallet address (base58). Phantom injects this automatically. For Swagger testing: paste any valid Solana wallet address.
     */
    account: string;
    /**
     * Vouch message via body. If message query param is present, query param takes priority. Phantom sends message as query param from the href template.
     */
    data?: VouchDataDto;
};

