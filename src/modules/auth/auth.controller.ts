import { Controller, Post, Get, Patch, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshDto } from './dto/refresh.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ManualJwtGuard } from './guards/manual-jwt.guard';
import { AdminGuard } from './guards/admin.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('debug-token')
  async debugToken(@Req() req: any) {
    const auth = req.headers.authorization;
    const info = {
      envLength: process.env.JWT_SECRET?.length,
      envFirst10: process.env.JWT_SECRET?.substring(0, 10),
    };
    if (!auth) return { error: 'No Authorization header', ...info };
    try {
      const token = auth.split(' ')[1];
      const decoded = this.authService.decodeToken(token);
      let verified = null;
      try {
        verified = await this.authService.verifyToken(token);
      } catch (e: any) {
        verified = { error: e.message };
      }
      return { decoded, verified, ...info };
    } catch (e: any) {
      return { error: e.message, ...info };
    }
  }

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @UseGuards(ManualJwtGuard)
  @Get('profile')
  async getProfile(@Req() req: any) {
    return this.authService.getProfile(req.user.sub);
  }

  @UseGuards(ManualJwtGuard)
  @Patch('profile')
  async updateProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(req.user.sub, dto);
  }

  @UseGuards(ManualJwtGuard)
  @Post('change-password')
  async changePassword(@Req() req: any, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.sub, dto.currentPassword, dto.newPassword);
  }

  @UseGuards(ManualJwtGuard, AdminGuard)
  @Get('pending-users')
  async getPendingUsers() {
    return this.authService.getPendingUsers();
  }

  @UseGuards(ManualJwtGuard, AdminGuard)
  @Patch('approve/:id')
  async approveUser(@Param('id') id: string) {
    return this.authService.approveUser(id);
  }

  @UseGuards(ManualJwtGuard, AdminGuard)
  @Delete('reject/:id')
  async rejectUser(@Param('id') id: string) {
    return this.authService.rejectUser(id);
  }

  @UseGuards(ManualJwtGuard)
  @Post('logout')
  async logout(@Req() req: any) {
    return this.authService.logout(req.user.sub);
  }
}
