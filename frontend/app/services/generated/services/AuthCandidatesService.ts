/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ActivateMfaDto } from '../models/ActivateMfaDto';
import type { LoginDtoSchema } from '../models/LoginDtoSchema';
import type { OnboardingDto } from '../models/OnboardingDto';
import type { RegisterDto } from '../models/RegisterDto';
import type { VerifyEmailDto } from '../models/VerifyEmailDto';
import type { VerifyMfaDto } from '../models/VerifyMfaDto';
import type { VerifyMfaRecoveryDto } from '../models/VerifyMfaRecoveryDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AuthCandidatesService {
    /**
     * Create new user account
     * Registers a new user and starts email verification flow. May return auth state depending on verification status.
     * @param requestBody
     * @returns any
     * @throws ApiError
     */
    public static authCandidateControllerRegister(
        requestBody: RegisterDto,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/auth/candidate/register',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Verify email address
     * Validates email verification code and activates user account.
     * @param requestBody
     * @returns any Email verified successfully
     * @throws ApiError
     */
    public static authCandidateControllerVerifyEmail(
        requestBody: VerifyEmailDto,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/auth/candidate/verify-email',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Authenticate user
     * Validates credentials and returns auth state (tokens, MFA, onboarding, or verification).
     * @param requestBody
     * @returns any
     * @throws ApiError
     */
    public static authCandidateControllerLogin(
        requestBody: LoginDtoSchema,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/auth/candidate/login',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Logout user
     * Invalidates refresh token and clears session cookies.
     * @returns any
     * @throws ApiError
     */
    public static authCandidateControllerLogout(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/auth/candidate/logout',
        });
    }
    /**
     * Start GitHub OAuth login
     * Redirects user to GitHub authentication page.
     * @returns any
     * @throws ApiError
     */
    public static authCandidateControllerGithubLogin(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/auth/candidate/github',
        });
    }
    /**
     * GitHub OAuth callback
     * Handles GitHub login callback and returns auth state response.
     * @returns any
     * @throws ApiError
     */
    public static authCandidateControllerGithubCallback(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/auth/candidate/github/callback',
        });
    }
    /**
     * Start Google OAuth login
     * @returns any
     * @throws ApiError
     */
    public static authCandidateControllerGoogleLogin(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/auth/candidate/google',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static authCandidateControllerGoogleCallback(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/auth/candidate/google/callback',
        });
    }
    /**
     * Complete onboarding
     * Finalizes onboarding using temporary auth token.
     * @param requestBody
     * @returns any
     * @throws ApiError
     */
    public static authCandidateControllerCompleteOnboarding(
        requestBody: OnboardingDto,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/auth/candidate/onboarding',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Link GitHub account
     * @returns any
     * @throws ApiError
     */
    public static authCandidateControllerLinkGithub(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/auth/candidate/github/link',
        });
    }
    /**
     * GitHub linking callback
     * @param state Security state parameter for OAuth verification
     * @returns any
     * @throws ApiError
     */
    public static authCandidateControllerLinkGithubCallback(
        state: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/auth/candidate/github/link/callback',
            query: {
                'state': state,
            },
        });
    }
    /**
     * Link Google account
     * @returns any
     * @throws ApiError
     */
    public static authCandidateControllerLinkGoogle(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/auth/candidate/google/link',
        });
    }
    /**
     * Google linking callback
     * @param state Security state parameter for OAuth verification
     * @returns any
     * @throws ApiError
     */
    public static authCandidateControllerLinkGoogleCallback(
        state: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/auth/candidate/google/link/callback',
            query: {
                'state': state,
            },
        });
    }
    /**
     * Refresh tokens
     * @returns any
     * @throws ApiError
     */
    public static authCandidateControllerRefresh(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/auth/candidate/refresh',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static authCandidateControllerSetupMfa(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/auth/candidate/mfa/setup',
        });
    }
    /**
     * @param requestBody
     * @returns any
     * @throws ApiError
     */
    public static authCandidateControllerActivateMfa(
        requestBody: ActivateMfaDto,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/auth/candidate/mfa/activate',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param requestBody
     * @returns any
     * @throws ApiError
     */
    public static authCandidateControllerVerifyMfa(
        requestBody: VerifyMfaDto,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/auth/candidate/mfa/verify',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param requestBody
     * @returns any
     * @throws ApiError
     */
    public static authCandidateControllerVerifyMfaRecovery(
        requestBody: VerifyMfaRecoveryDto,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/auth/candidate/mfa/verify-recovery',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
