import { IsUUID } from 'class-validator';

export class ConfirmPaymentDto {
  @IsUUID()
  inscriptionId: string;
}
