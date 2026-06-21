import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { FormationService } from './formation.service';
import { CreateFormationDto } from './dto/create-formation.dto';
import { UpdateFormationDto } from './dto/update-formation.dto';
import { ManualJwtGuard } from '../auth/guards/manual-jwt.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('formations')
export class FormationController {
  constructor(private readonly formationService: FormationService) {}

  @Post()
  @UseGuards(ManualJwtGuard, AdminGuard)
  create(@Body() dto: CreateFormationDto) {
    return this.formationService.create(dto);
  }

  @Get()
  findAll() {
    return this.formationService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.formationService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(ManualJwtGuard, AdminGuard)
  update(@Param('id') id: string, @Body() dto: UpdateFormationDto) {
    return this.formationService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(ManualJwtGuard, AdminGuard)
  remove(@Param('id') id: string) {
    return this.formationService.remove(id);
  }

  @Post(':id/upload')
  @UseGuards(ManualJwtGuard, AdminGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(__dirname, '..', '..', '..', 'uploads', 'formations'),
        filename: (_req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, uniqueSuffix + extname(file.originalname));
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
          cb(new Error('Seuls les fichiers PDF sont acceptés'), false);
        } else {
          cb(null, true);
        }
      },
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async upload(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.formationService.addSupport(id, {
      nom: file.originalname,
      url: `/uploads/formations/${file.filename}`,
      type: 'pdf',
    });
  }

  @Post(':id/upload-image')
  @UseGuards(ManualJwtGuard, AdminGuard)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: join(__dirname, '..', '..', '..', 'uploads', 'formations'),
        filename: (_req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, 'img-' + uniqueSuffix + extname(file.originalname));
        },
      }),
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowed.includes(file.mimetype)) {
          cb(new Error('Seules les images JPG, PNG, WebP et GIF sont acceptées'), false);
        } else {
          cb(null, true);
        }
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadImage(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.formationService.updateImage(id, `/uploads/formations/${file.filename}`);
  }

  @Delete(':id/supports/:index')
  @UseGuards(ManualJwtGuard, AdminGuard)
  async removeSupport(@Param('id') id: string, @Param('index') index: string) {
    return this.formationService.removeSupport(id, parseInt(index));
  }
}
