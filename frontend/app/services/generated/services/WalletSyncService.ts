/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ChallengeResponseDto } from '../models/ChallengeResponseDto';
import type { LinkWalletRequestDto } from '../models/LinkWalletRequestDto';
import type { LinkWalletResponseDto } from '../models/LinkWalletResponseDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class WalletSyncService {
    /**
     * Generate wallet linking challenge
     * Creates a time-limited cryptographic challenge used to verify wallet ownership before linking a Solana wallet to the user account. Flow [server gives you a challenge-message >>> wallet signs challenge-message >>> server verifies signature match for challenge-message] This is step 1 in the flow
     * @returns ChallengeResponseDto Challenge successfully generated
     * @throws ApiError
     */
    public static walletSyncControllerGetChallenge(): CancelablePromise<ChallengeResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/sync/wallet/challenge',
            errors: {
                401: `User is not authenticated`,
            },
        });
    }
    /**
     * Verify wallet signature and link wallet
     * Verifies a Solana wallet signature against a previously generated challenge and links the wallet to the authenticated user account.
     * @param requestBody Wallet address and cryptographic signature
     * @returns LinkWalletResponseDto Wallet successfully linked
     * @throws ApiError
     */
    public static walletSyncControllerLinkWallet(
        requestBody: LinkWalletRequestDto,
    ): CancelablePromise<LinkWalletResponseDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/sync/wallet',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid wallet address format`,
                401: `Signature verification failed`,
                404: `Challenge expired or candidate profile missing`,
            },
        });
    }
}
