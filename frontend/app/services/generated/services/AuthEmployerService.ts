/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { LoginDto } from '../models/LoginDto';
import type { LoginResponseDto } from '../models/LoginResponseDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AuthEmployerService {
    /**
     * Login with Privy token
     * Verifies a Privy access token from frontend authentication and returns a signed JWT for API access.
     * TESTING:
     * 1. make sure .env > PRIVY_BYPASS="true"
     * 2. Bearer Token = debugtoken
     * 3. Authorization header = did:privy:test-user-123
     * @param authorization
     * @param requestBody Optional login metadata used during company creation or update
     * @returns LoginResponseDto Successfully authenticated and returned application JWT
     * @throws ApiError
     */
    public static authEmployerControllerLogin(
        authorization: string,
        requestBody: LoginDto,
    ): CancelablePromise<LoginResponseDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/auth/employer/login',
            headers: {
                'authorization': authorization,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Missing authorization header or invalid request payload`,
                401: `Invalid or missing Privy token`,
            },
        });
    }
    /**
     * Logout user
     * Invalidates the user session or JWT token.
     * @returns any
     * @throws ApiError
     */
    public static authEmployerControllerLogout(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/auth/employer/logout',
        });
    }
}
