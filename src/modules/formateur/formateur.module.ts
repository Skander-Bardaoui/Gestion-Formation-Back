import { Module } from '@nestjs/common';
import { FormateurController } from './formateur.controller';
import { UserModule } from '../user/user.module';

@Module({
  imports: [UserModule],
  controllers: [FormateurController],
})
export class FormateurModule {}
