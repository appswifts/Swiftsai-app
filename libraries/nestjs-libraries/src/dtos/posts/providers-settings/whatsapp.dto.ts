import { IsOptional, IsString } from 'class-validator';

export class WhatsappDto {
  @IsOptional()
  @IsString()
  templateName?: string;

  @IsOptional()
  @IsString()
  language?: string;
}
