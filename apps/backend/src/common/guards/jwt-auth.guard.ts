import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedRequest } from '../types/authenticated-request';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly prisma: PrismaService) {
    super();
  }
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const authenticated = (await super.canActivate(context)) as boolean;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const tenant = await this.prisma.restaurant.findUnique({
      where: { id: request.user.restaurantId },
      select: { status: true },
    });
    if (!tenant || tenant.status === 'PENDING' || tenant.status === 'DECLINED')
      throw new ForbiddenException('This restaurant account is not active.');
    if (
      tenant.status === 'READ_ONLY' &&
      !['GET', 'HEAD', 'OPTIONS'].includes(request.method)
    )
      throw new ForbiddenException(
        'This restaurant is read only until platform access is restored.',
      );
    return authenticated;
  }
}
