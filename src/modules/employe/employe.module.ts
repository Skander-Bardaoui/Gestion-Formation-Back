import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employe } from '../../entities/employe.entity';
import { EmployeController } from './employe.controller';
import { EmployeService } from './employe.service';

@Module({
  imports: [TypeOrmModule.forFeature([Employe])],
  controllers: [EmployeController],
  providers: [EmployeService],
  exports: [EmployeService],
})
export class EmployeModule {}
