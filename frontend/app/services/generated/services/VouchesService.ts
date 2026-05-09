/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ConfirmVouchDto } from '../models/ConfirmVouchDto';
import type { RevokeVouchDto } from '../models/RevokeVouchDto';
import type { VouchResponseDto } from '../models/VouchResponseDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class VouchesService {
    /**
     * Confirm a vouch (on-chain verified endorsement)
     *
     * Creates and anchors a vouch for a candidate using a Solana transaction.
     *
     * This endpoint:
     * - Verifies the transaction exists on-chain
     * - Confirms the voucher wallet is the fee payer
     * - Validates memo message matches the provided message
     * - Enforces rules: no self-vouch, no duplicates, budget limits
     *
     * Authentication: JWT required. Uses the linked Solana wallet.
     *
     * @param requestBody Payload required to confirm a vouch
     * @returns VouchResponseDto Vouch successfully confirmed and stored
     * @throws ApiError
     */
    public static vouchesControllerConfirmVouch(
        requestBody: ConfirmVouchDto,
    ): CancelablePromise<VouchResponseDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/vouch/confirm',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Validation error, duplicate vouch, self-vouch, budget exceeded, or invalid transaction`,
                404: `Candidate not found`,
            },
        });
    }
    /**
     * Revoke a vouch
     *
     * Revokes an existing vouch.
     *
     * Authentication: JWT required. Uses the linked Solana wallet.
     *
     * @param id Unique identifier of the vouch
     * @param requestBody Wallet signature proof required to revoke a vouch
     * @returns void
     * @throws ApiError
     */
    public static vouchesControllerRevokeVouch(
        id: string,
        requestBody: RevokeVouchDto,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/vouch/{id}',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Malformed signature or already inactive vouch`,
                401: `Signature verification failed`,
                404: `Vouch not found or wallet mismatch`,
            },
        });
    }
    /**
     * Helius transaction webhook (internal)
     * Receives Enhanced Transaction events from Helius for on-chain vouch processing.
     * @param xHeliusWebhookSecret
     * @param requestBody
     * @returns any
     * @throws ApiError
     */
    public static vouchesControllerHeliusWebhook(
        xHeliusWebhookSecret: string,
        requestBody: Array<string>,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/vouch/webhooks/helius',
            headers: {
                'x-helius-webhook-secret': xHeliusWebhookSecret,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
