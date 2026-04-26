import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class InternalKeyGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
	console.log("requerst: ", request.headers);
    const internalKey = request.headers['x-internal-key'];
		console.log("internal key", internalKey);
    const expectedKey = this.configService.get<string>('INTERNAL_API_KEY');
	console.log("expected: ", expectedKey);
    // console.log("InternalKeyGuard: Received key:[", internalKey, "]");
    // console.log("InternalKeyGuard: Expected key:[", expectedKey,"]");
    if (!expectedKey) {
      throw new Error('INTERNAL_API_KEY is not configured in the environment');
    }

    if (internalKey !== expectedKey) {
      throw new ForbiddenException('Invalid or missing X-Internal-Key');
    }

    return true;
  }
}
