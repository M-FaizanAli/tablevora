import {
  Body,
  CanActivate,
  Controller,
  ExecutionContext,
  ForbiddenException,
  Get,
  Injectable,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Module } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  platformAdminBootstrapSchema,
  platformAdminBootstrapConfirmSchema,
  platformAdminLoginSchema,
  platformRestaurantListQuerySchema,
  platformRestaurantStatusUpdateSchema,
  platformRestaurantCreateSchema,
  platformInviteTokenSchema,
  platformInviteAcceptSchema,
} from '@nodedr-restaurant/types';
import { PlatformAdminService } from './platform-admin.service';
import { PrismaModule } from '../prisma/prisma.module';

const COOKIE = 'tablevora_platform_session';
const secure = () => process.env.COOKIE_SECURE === 'true';
interface AdminRequest extends Request {
  platformAdmin?: { id: string; email: string; name: string };
}

@Injectable()
class PlatformAdminGuard implements CanActivate {
  constructor(private readonly service: PlatformAdminService) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<AdminRequest>();
    if (
      process.env.DEMO_MODE === 'true' ||
      process.env.PLATFORM_ADMIN_ENABLED !== 'true'
    )
      throw new ForbiddenException(
        'Platform administration is disabled on this service.',
      );
    req.platformAdmin = await this.service.authenticate(
      req.cookies?.[COOKIE] || '',
    );
    return true;
  }
}

@Controller('v1/platform')
class PlatformAdminController {
  constructor(private readonly service: PlatformAdminService) {}
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('auth/bootstrap')
  @UsePipes(new ZodValidationPipe(platformAdminBootstrapSchema))
  bootstrap(@Body() body: any) {
    return this.service.bootstrap(body);
  }
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('auth/bootstrap/confirm')
  @UsePipes(new ZodValidationPipe(platformAdminBootstrapConfirmSchema))
  async confirm(@Body() body: any, @Res({ passthrough: true }) res: Response) {
    const result = await this.service.confirmBootstrap(body);
    res.cookie(COOKIE, result.session.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: secure(),
      path: '/',
      maxAge: 8 * 60 * 60 * 1000,
    });
    return { recoveryCodes: result.recoveryCodes, admin: result.session.admin };
  }
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('auth/login')
  @UsePipes(new ZodValidationPipe(platformAdminLoginSchema))
  async login(@Body() body: any, @Res({ passthrough: true }) res: Response) {
    const result = await this.service.login(body);
    res.cookie(COOKIE, result.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: secure(),
      path: '/',
      maxAge: 8 * 60 * 60 * 1000,
    });
    return { admin: result.admin };
  }
  @UseGuards(PlatformAdminGuard) @Get('auth/me') me(@Req() req: AdminRequest) {
    return { admin: req.platformAdmin };
  }
  @UseGuards(PlatformAdminGuard) @Post('auth/logout') async logout(
    @Req() req: AdminRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.service.logout(req.platformAdmin!.id);
    res.clearCookie(COOKIE, {
      httpOnly: true,
      sameSite: 'lax',
      secure: secure(),
      path: '/',
    });
    return { ok: true };
  }
  @UseGuards(PlatformAdminGuard) @Get('restaurants') list(@Req() req: Request) {
    const q = platformRestaurantListQuerySchema.parse(req.query);
    return this.service.list(q);
  }
  @UseGuards(PlatformAdminGuard)
  @Post('restaurants')
  @UsePipes(new ZodValidationPipe(platformRestaurantCreateSchema))
  createRestaurant(@Req() req: AdminRequest, @Body() body: any) {
    return this.service.createRestaurant(req.platformAdmin!.id, body);
  }
  @UseGuards(PlatformAdminGuard)
  @Post('restaurants/:id/invite')
  reissueInvite(@Req() req: AdminRequest, @Param('id') id: string) {
    return this.service.reissueInvite(req.platformAdmin!.id, id);
  }
  @UseGuards(PlatformAdminGuard) @Get('restaurants/:id') detail(
    @Param('id') id: string,
  ) {
    return this.service.detail(id);
  }
  @UseGuards(PlatformAdminGuard)
  @Patch('restaurants/:id/status')
  @UsePipes(new ZodValidationPipe(platformRestaurantStatusUpdateSchema))
  setStatus(
    @Req() req: AdminRequest,
    @Param('id') id: string,
    @Body() body: { status: 'ACTIVE' | 'READ_ONLY' | 'DECLINED' },
  ) {
    return this.service.setStatus(req.platformAdmin!.id, id, body.status);
  }
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('invites/validate')
  @UsePipes(new ZodValidationPipe(platformInviteTokenSchema))
  validateInvite(@Body() body: { token: string }) {
    return this.service.validateInvite(body.token);
  }
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('invites/accept')
  @UsePipes(new ZodValidationPipe(platformInviteAcceptSchema))
  acceptInvite(@Body() body: { token: string; password: string }) {
    return this.service.acceptInvite(body.token, body.password);
  }
}

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: createHmac('sha256', 'tablevora-platform-admin-jwt')
          .update(config.getOrThrow<string>('JWT_SECRET'))
          .digest('hex'),
        signOptions: {
          issuer: 'tablevora-platform',
          audience: 'tablevora-platform-console',
        },
      }),
    }),
  ],
  controllers: [PlatformAdminController],
  providers: [PlatformAdminService, PlatformAdminGuard],
})
export class PlatformAdminModule {}
