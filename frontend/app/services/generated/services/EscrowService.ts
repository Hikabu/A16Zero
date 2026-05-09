/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ConfirmFundedDto } from '../models/ConfirmFundedDto';
import type { ConfirmResolvedDto } from '../models/ConfirmResolvedDto';
import type { SetCandidateDto } from '../models/SetCandidateDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class EscrowService {
    /**
     * Get escrow initialization params
     * Employer-only endpoint called before creating escrow on-chain. The backend derives the deterministic escrow id from the job UUID, derives the PDA from the authenticated employer wallet, and returns the exact USDT amount in 6-decimal base units.
     * @param jobPostId Job post id owned by the authenticated employer.
     * @returns any Escrow init params returned.
     * @throws ApiError
     */
    public static escrowControllerInitParams(
        jobPostId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/escrow/init-params/{jobPostId}',
            path: {
                'jobPostId': jobPostId,
            },
            errors: {
                401: `Missing or invalid JWT.`,
                403: `Authenticated company or wallet does not own the job post.`,
            },
        });
    }
    /**
     * Confirm funded escrow
     * Employer-only endpoint called after the employer funds escrow on-chain. The backend verifies the PDA, employer wallet, and funded amount, then records the CREATED -> FUNDED transition. Idempotency: repeating the same confirmation is safe and must not create duplicate state; conflicting funding attempts are rejected.
     * @param requestBody
     * @returns any Escrow funding verified and stored.
     * @throws ApiError
     */
    public static escrowControllerConfirmFunded(
        requestBody: ConfirmFundedDto,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/escrow/confirm-funded',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid DTO, transaction not found on-chain, wrong amount funded, invalid PDA, or invalid employer wallet.`,
                401: `Missing or invalid JWT.`,
                403: `Authenticated user is not the employer that owns the job post.`,
                409: `Escrow is already funded with conflicting details.`,
            },
        });
    }
    /**
     * Attach candidate wallet
     * Employer-only endpoint called after the candidate has been set on-chain. The backend verifies the funded escrow and candidate wallet, then records the FUNDED -> CANDIDATE_SET transition. Idempotency: setting the same candidate twice should return the current state; changing an existing candidate is rejected.
     * @param requestBody
     * @returns any Candidate wallet verified and stored.
     * @throws ApiError
     */
    public static escrowControllerSetCandidate(
        requestBody: SetCandidateDto,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/escrow/set-candidate',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid DTO, escrow not funded yet, invalid wallet format, or on-chain candidate mismatch.`,
                401: `Missing or invalid JWT.`,
                403: `Authenticated user is not the employer that owns the job post.`,
                409: `Candidate already set with different wallet or escrow already resolved.`,
            },
        });
    }
    /**
     * Confirm released escrow
     * Employer-only endpoint called after the on-chain program releases escrow to the candidate. The backend verifies the on-chain resolution and signer ownership, then records CANDIDATE_SET -> RELEASED. Idempotency: repeated release confirmation returns the released state; refunding after release is rejected.
     * @param requestBody
     * @returns any Escrow release verified and stored.
     * @throws ApiError
     */
    public static escrowControllerConfirmReleased(
        requestBody: ConfirmResolvedDto,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/escrow/confirm-released',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid DTO, escrow not funded, candidate not set, not resolved on-chain, or wrong signer releasing.`,
                401: `Missing or invalid JWT.`,
                403: `Authenticated user is not the employer that owns the job post.`,
                409: `Escrow already released or refunded.`,
            },
        });
    }
    /**
     * Confirm refunded escrow
     * Employer-only endpoint called after the on-chain program refunds escrow to the employer. The backend verifies on-chain resolution and ownership, then records FUNDED or CANDIDATE_SET -> REFUNDED. Idempotency: repeated refund confirmation returns the refunded state; release after refund is rejected.
     * @param requestBody
     * @returns any Escrow refund verified and stored.
     * @throws ApiError
     */
    public static escrowControllerConfirmRefunded(
        requestBody: ConfirmResolvedDto,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/escrow/confirm-refunded',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid DTO, escrow not funded, not resolved on-chain, or wrong signer refunding.`,
                401: `Missing or invalid JWT.`,
                403: `Authenticated user is not the employer that owns the job post.`,
                409: `Escrow already released or refunded.`,
            },
        });
    }
    /**
     * Get escrow status
     * Employer-only endpoint for polling persisted escrow state and the latest on-chain state. It does not transition state. Only the employer that owns the job post can read it.
     * @param jobPostId Job post id owned by the authenticated employer.
     * @returns any Escrow status returned.
     * @throws ApiError
     */
    public static escrowControllerStatus(
        jobPostId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/escrow/status/{jobPostId}',
            path: {
                'jobPostId': jobPostId,
            },
            errors: {
                400: `Invalid jobPostId parameter.`,
                401: `Missing or invalid JWT.`,
                403: `Authenticated user is not the owner of the job post.`,
                409: `Reserved for state read conflicts.`,
            },
        });
    }
}
