/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { VouchRequestDto } from '../models/VouchRequestDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class SolanaBlinksService {
    /**
     * Get Blink Card for vouching
     * Returns the Solana Action metadata for rendering a vouch card in wallets.
     * @param username GitHub username to vouch for
     * @returns any Blink card metadata
     * @throws ApiError
     */
    public static actionsControllerGetBlinkCard(
        username: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/actions/vouch/{username}',
            path: {
                'username': username,
            },
        });
    }
    /**
     * Request vouch transaction
     * @param username
     * @param requestBody
     * @param message This field is used by the wallet - frontened should write the message in the body
     * @returns any
     * @throws ApiError
     */
    public static actionsControllerGetBlinkTransaction(
        username: string,
        requestBody: VouchRequestDto,
        message?: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/actions/vouch/{username}',
            path: {
                'username': username,
            },
            query: {
                'message': message,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
