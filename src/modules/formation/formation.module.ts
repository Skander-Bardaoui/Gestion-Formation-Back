import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Formation } from '../../entities/formation.entity';
import { User } from '../../entities/user.entity';
import { FormationController } from './formation.controller';
import { FormationService } from './formation.service';
import { AuthModule } from '../auth/auth.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Formation, User]),
    MulterModule.register({}),
    AuthModule,
    NotificationModule,
  ],
  controllers: [FormationController],
  providers: [FormationService],
  exports: [FormationService],
})
export class FormationModule {}
