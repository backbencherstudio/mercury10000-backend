import { PartialType } from '@nestjs/swagger';
import { CreateGiftcardDto } from './create-giftcard.dto';

export class UpdateGiftcardDto extends PartialType(CreateGiftcardDto) {}
