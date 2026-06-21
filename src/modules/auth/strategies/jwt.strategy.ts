import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../entities/user.entity';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'dev-secret-key-change-in-production',
    });
    console.log(`[JWT Strategy] env length=${process.env.JWT_SECRET?.length} first10=${process.env.JWT_SECRET?.substring(0, 10)}`);
  }

  async validate(payload: JwtPayload): Promise<User> {
    console.log(`[JWT] validate: sub=${payload.sub}, email=${payload.email}, role=${payload.role}`);
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
      relations: {},
    });
    console.log(`[JWT] user found=${!!user}, isActive=${user?.isActive}, role=${user?.role}`);
    if (!user || !user.isActive) {
      console.log(`[JWT] rejecting user: ${!user ? 'not found' : 'inactive'}`);
      throw new UnauthorizedException();
    }
    return user;
  }
}
