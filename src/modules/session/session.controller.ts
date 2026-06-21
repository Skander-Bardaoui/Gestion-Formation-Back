import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Res } from '@nestjs/common';
import { Response } from 'express';
import { SessionService } from './session.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { ManualJwtGuard } from '../auth/guards/manual-jwt.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('sessions')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Post()
  @UseGuards(ManualJwtGuard, AdminGuard)
  create(@Body() dto: CreateSessionDto) {
    return this.sessionService.create(dto);
  }

  @Get()
  @UseGuards(ManualJwtGuard)
  findAll() {
    return this.sessionService.findAll();
  }

  @Get('mine')
  @UseGuards(ManualJwtGuard)
  findMine(@Req() req: any) {
    return this.sessionService.findMySessions(req.user.sub, req.user.role);
  }

  @Get(':id')
  @UseGuards(ManualJwtGuard)
  findOne(@Param('id') id: string) {
    return this.sessionService.findOne(id);
  }

  @Post(':id/enroll')
  @UseGuards(ManualJwtGuard)
  enroll(@Param('id') id: string, @Req() req: any) {
    return this.sessionService.enroll(id, req.user.sub);
  }

  @Get(':id/presence-list')
  @UseGuards(ManualJwtGuard, AdminGuard)
  async presenceList(@Param('id') id: string, @Res() res: Response) {
    const { buffer, titre } = await this.sessionService.generatePresenceList(id);
    const sanitized = titre.replace(/[^a-zA-Z0-9]/g, '_');
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="feuille_presence_${sanitized}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Patch(':id')
  @UseGuards(ManualJwtGuard, AdminGuard)
  update(@Param('id') id: string, @Body() dto: UpdateSessionDto) {
    return this.sessionService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(ManualJwtGuard, AdminGuard)
  remove(@Param('id') id: string) {
    return this.sessionService.remove(id);
  }
}
