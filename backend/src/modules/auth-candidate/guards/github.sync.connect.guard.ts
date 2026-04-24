import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GithubSyncConnectGuard extends AuthGuard('githubSyncConnect') {
  getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();

    return {
      state: req.query.state,
    };
  }

  handleRequest(err, user, info, context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();

    // preserve JWT user BEFORE overwrite
    const jwtUser = req.user;

    if (err || !user) {
      throw err || new UnauthorizedException(info?.message || 'OAuth failed');
    }

    req.authUser = jwtUser; //  store original user
    return user; // becomes req.user (GitHub)
  }
}
