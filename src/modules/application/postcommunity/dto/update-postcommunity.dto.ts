import { PartialType } from '@nestjs/swagger';
import { CreatePostDto } from './create-postcommunity.dto';

export class UpdatePostcommunityDto extends PartialType(CreatePostDto) {}
