import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class ManualJwtGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const auth = request.headers.authorization;
    if (!auth) throw new UnauthorizedException('No token');

    try {
      const token = auth.split(' ')[1];
      const payload = this.jwtService.verify(token);
      request.user = payload;
      return true;
    } catch (e: any) {
      console.log(`[ManualJwtGuard] reject: ${e.message}`);
      throw new UnauthorizedException(e.message);
    }
  }
}
