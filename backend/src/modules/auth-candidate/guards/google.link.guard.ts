import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleLinkGuard extends AuthGuard('googleLink') {
  getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();

    return {
      state: req.query.state,
    };
  }
  handleRequest(err, user, info, context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();

    const jwtUser = req.user;

    if (err || !user) {
      throw err || new UnauthorizedException(info?.message || 'OAuth failed');
    }

    req.authUser = jwtUser; // preserve original user
    return user; // becomes req.user (GitHub)
  }
}
