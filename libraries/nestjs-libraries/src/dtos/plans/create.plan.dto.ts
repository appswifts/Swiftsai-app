import { IsString, IsBoolean, IsNumber, IsOptional, Min } from 'class-validator';

export class CreatePlanDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  monthPrice: number;

  @IsNumber()
  @Min(0)
  yearPrice: number;

  @IsNumber()
  @Min(0)
  maxChannels: number;

  @IsNumber()
  @Min(1)
  maxOrganizations: number;

  @IsNumber()
  @Min(0)
  maxPlatforms: number;

  @IsNumber()
  @Min(0)
  postsPerMonth: number;

  @IsBoolean()
  teamMembers: boolean;

  @IsBoolean()
  communityFeatures: boolean;

  @IsBoolean()
  featuredByAppswifts: boolean;

  @IsBoolean()
  ai: boolean;

  @IsBoolean()
  importFromChannels: boolean;

  @IsBoolean()
  imageGenerator: boolean;

  @IsNumber()
  @Min(0)
  imageGenerationCount: number;

  @IsNumber()
  @Min(0)
  generateVideos: number;

  @IsBoolean()
  publicApi: boolean;

  @IsNumber()
  @Min(0)
  webhooks: number;

  @IsBoolean()
  autoPost: boolean;

  @IsBoolean()
  inbox: boolean;

  @IsBoolean()
  campaigns: boolean;

  @IsBoolean()
  leads: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  polarProductMonthlyId?: string;

  @IsOptional()
  @IsString()
  polarProductYearlyId?: string;
}
