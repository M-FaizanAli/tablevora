import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// Phase 1 tenancy check: a branch belongs to exactly one restaurant, and a
// user belongs to exactly one restaurant — this confirms the branchId a
// request references actually belongs to the caller's restaurant. It does
// NOT yet enforce per-branch staff assignment (UserBranch is populated but
// not checked here); that's a deliberate Phase-later tightening once
// multi-branch staff scoping is actually needed, tracked in ROADMAP.md.
@Injectable()
export class BranchAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async assertAccess(restaurantId: string, branchId: string): Promise<void> {
    // Reject missing, repeated, empty, and padded values before Prisma can
    // omit an undefined filter. Do not silently trim only the access check:
    // downstream services must query the identical branch identifier.
    if (typeof branchId !== 'string' || !branchId.trim() || branchId !== branchId.trim()) {
      throw new BadRequestException('A non-empty branchId is required without surrounding whitespace');
    }
    if (typeof restaurantId !== 'string' || !restaurantId.trim()) {
      throw new ForbiddenException('Restaurant not accessible');
    }
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, restaurantId },
      select: { id: true },
    });
    if (!branch) {
      throw new ForbiddenException('Branch not found or not accessible');
    }
  }
}
