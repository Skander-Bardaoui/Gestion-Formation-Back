import { IsString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { DocumentType } from '../../../entities/document-signe.entity';

export class CreateDocumentSigneDto {
  @IsEnum(DocumentType)
  type: DocumentType;

  @IsString()
  titre: string;

  @IsString()
  fileUrl: string;

  @IsOptional()
  @IsString()
  fileSize?: string;

  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @IsOptional()
  @IsUUID()
  participantId?: string;
}
