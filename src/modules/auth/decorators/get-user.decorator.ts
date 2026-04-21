import {
  applyDecorators,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';

export const GetUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);

export function ApiAllAuth() {
  return applyDecorators(
    ApiBearerAuth('user_token'),
    ApiBearerAuth('admin_token'),
    ApiBearerAuth('secretery_token'),
  );
}
