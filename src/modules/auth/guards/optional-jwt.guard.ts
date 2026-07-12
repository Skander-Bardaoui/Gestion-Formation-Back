import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class OptionalJwtGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const auth = request.headers.authorization;
    if (!auth) return true;

    try {
      const token = auth.split(' ')[1];
      const payload = this.jwtService.verify(token);
      if (payload && typeof payload.sub === 'object') {
        console.log('[OptionalJwtGuard] sub is an object!', JSON.stringify(payload.sub));
      }
      if (payload && payload.sub === '[object Object]') {
        console.log('[OptionalJwtGuard] sub is literal [object Object] string!', payload);
      }
      request.user = payload;
    } catch {}

    return true;
  }
}
