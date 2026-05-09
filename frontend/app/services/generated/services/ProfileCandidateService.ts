/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CandidateProfileResponseDto } from '../models/CandidateProfileResponseDto';
import type { GithubConnectionResponseDto } from '../models/GithubConnectionResponseDto';
import type { SimpleMessageResponseDto } from '../models/SimpleMessageResponseDto';
import type { UpdateCandidateDto } from '../models/UpdateCandidateDto';
import type { UpdateUserDto } from '../models/UpdateUserDto';
import type { UserProfileResponseDto } from '../models/UserProfileResponseDto';
import type { Web3ConnectionResponseDto } from '../models/Web3ConnectionResponseDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ProfileCandidateService {
    /**
     * Get current user profile
     * Returns authenticated user profile including linked auth providers (Google, GitHub, etc).
     * @returns UserProfileResponseDto
     * @throws ApiError
     */
    public static profileControllerGetProfile(): CancelablePromise<UserProfileResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/me/user',
            errors: {
                404: `User not found`,
            },
        });
    }
    /**
     * Update user profile
     * Updates first name, last name, and username.
     * @param requestBody
     * @returns UserProfileResponseDto
     * @throws ApiError
     */
    public static profileControllerUpdateProfile(
        requestBody: UpdateUserDto,
    ): CancelablePromise<UserProfileResponseDto> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/me/user',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Validation or username conflict error`,
            },
        });
    }
    /**
     * Deactivate account
     * Marks the user account as suspended.
     * @returns SimpleMessageResponseDto
     * @throws ApiError
     */
    public static profileControllerDeactivateAccount(): CancelablePromise<SimpleMessageResponseDto> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/me/user',
        });
    }
    /**
     * Get candidate profile
     * Returns candidate-specific data including bio, career path, and dev profile.
     * @returns CandidateProfileResponseDto
     * @throws ApiError
     */
    public static profileControllerGetCandidateProfile(): CancelablePromise<CandidateProfileResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/me/user/candidate',
            errors: {
                404: `Candidate profile not found`,
            },
        });
    }
    /**
     * Update candidate profile
     * Updates bio and career path.
     * @param requestBody
     * @returns CandidateProfileResponseDto
     * @throws ApiError
     */
    public static profileControllerUpdateCandidateProfile(
        requestBody: UpdateCandidateDto,
    ): CancelablePromise<CandidateProfileResponseDto> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/me/user/candidate',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Validation error`,
            },
        });
    }
    /**
     * Get GitHub connection status
     * Returns whether GitHub is connected and sync status (without exposing tokens).
     * @returns GithubConnectionResponseDto
     * @throws ApiError
     */
    public static profileControllerGetConnectedGithub(): CancelablePromise<GithubConnectionResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/me/user/github',
            errors: {
                404: `Candidate profile not found`,
            },
        });
    }
    /**
     * Get wallet connection status
     * Returns whether wallet is connected and sync status to which address.
     * @returns Web3ConnectionResponseDto
     * @throws ApiError
     */
    public static profileControllerGetConnectedWallet(): CancelablePromise<Web3ConnectionResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/me/user/wallet',
            errors: {
                404: `Candidate profile not found`,
            },
        });
    }
}
