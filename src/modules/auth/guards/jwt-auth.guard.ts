import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    console.log(`[JwtAuthGuard] err=${err?.message}, user=${!!user}, info=${info?.message}, infoConstructor=${info?.constructor?.name}`);
    if (err || !user) {
      throw err || new UnauthorizedException(info?.message || 'Non autorisé');
    }
    return user;
  }
}

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any) {
    return user || null;
  }
}
