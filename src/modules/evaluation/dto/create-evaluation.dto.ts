import { IsNumber, IsString, IsOptional, IsBoolean, IsUUID, IsDateString, Min, Max } from 'class-validator';

export class CreateEvaluationDto {
  @IsNumber()
  @Min(0)
  @Max(5)
  note: number;

  @IsOptional()
  @IsString()
  commentaire?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  noteContenu?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  notePedagogie?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  noteSupports?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  noteOrganisation?: number;

  @IsOptional()
  @IsBoolean()
  recommande?: boolean;

  @IsDateString()
  dateEvaluation: string;

  @IsUUID()
  formateurId: string;

  @IsUUID()
  sessionId: string;

  @IsUUID()
  participantId: string;
}
