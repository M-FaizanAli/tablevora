import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';

// A shared showcase may exercise day-to-day operations, but cannot change
// credentials, integrations, infrastructure, or invoke physical printers.
@Injectable()
export class DemoGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (process.env.DEMO_MODE !== 'true') return true;
    const req = context.switchToHttp().getRequest<Request>();
    const path = req.path.replace(/\/+$/, '');
    if (/^\/api\/v1\/(backup|backups|system|integrations|integration-api-keys|staff-api-keys|api-keys|mcp|webhooks|verifactu)(\/|$)/.test(path) || /\/print(\/|$)|\/reprint$/.test(path)) {
      throw new ForbiddenException('This feature is disabled in the shared demo.');
    }
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return true;
    if (req.method === 'POST' && path === '/api/v1/menu/items/upload-image') return true;
    if (req.method === 'PATCH' && /^\/api\/v1\/menu\/items\/[^/]+\/photo$/.test(path)) return true;
    const operational = [
      /^\/api\/v1\/auth\/(login|logout)$/,
      /^\/api\/v1\/orders$/,
      /^\/api\/v1\/orders\/[^/]+\/(items|accept|reject|cancel|discount-preview|bill-preview|checkout|refund|merge)$/,
      /^\/api\/v1\/orders\/[^/]+\/items\/[^/]+(?:\/remove)?$/,

      /^\/api\/v1\/kds\/tickets\/[^/]+\/(status|priority|reject)$/,
      /^\/api\/v1\/kds\/incoming\/[^/]+\/(accept|reject)$/,
      /^\/api\/v1\/tables\/[^/]+\/status$/,
      /^\/api\/v1\/notifications\/[^/]+\/read$/,
    ];
    if (req.method === 'PATCH' && /^\/api\/v1\/orders\/[^/]+$/.test(path)) return true;
    if (operational.some((route) => route.test(path))) return true;
    throw new ForbiddenException('Configuration changes are disabled in the shared demo. You can explore orders, tables, and the kitchen.');
  }
}
