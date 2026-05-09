/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CompanyProfileResponseDto } from '../models/CompanyProfileResponseDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ProfileCompanyService {
    /**
     * Get current company profile
     * Returns the authenticated company profile including job post statistics.
     * @returns CompanyProfileResponseDto Company profile retrieved successfully
     * @throws ApiError
     */
    public static companiesControllerGetMe(): CancelablePromise<CompanyProfileResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/me/company',
            errors: {
                404: `Company not found for authenticated user`,
            },
        });
    }
}
