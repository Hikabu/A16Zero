import { HttpStatus } from '@nestjs/common';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: any;
}

export class BaseController {
  protected handleSuccess<T>(data: T, message?: string, meta?: any): ApiResponse<T> {
    return {
      success: true,
      message,
      data,
      meta,
    };
  }

  protected handleCreated<T>(data: T, message?: string): ApiResponse<T> {
    return {
      success: true,
      message: message || 'Created successfully',
      data,
    };
  }
}
