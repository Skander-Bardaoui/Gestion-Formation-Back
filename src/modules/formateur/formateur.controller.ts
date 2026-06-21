import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { CreateFormateurDto } from './dto/create-formateur.dto';
import { UpdateFormateurDto } from './dto/update-formateur.dto';

@Controller('formateurs')
export class FormateurController {
  constructor(private readonly userService: UserService) {}

  @Post()
  create(@Body() dto: CreateFormateurDto) {
    return this.userService.createFormateur(dto);
  }

  @Get()
  findAll() {
    return this.userService.findAllFormateurs();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFormateurDto) {
    return this.userService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
