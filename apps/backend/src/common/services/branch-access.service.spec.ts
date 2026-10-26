import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { BranchAccessService } from './branch-access.service';

describe('branch isolation boundary', () => {
  const findFirst = jest.fn();
  const service = new BranchAccessService({ branch: { findFirst } } as never);
  beforeEach(() => findFirst.mockReset());
  it.each([undefined, null, '', ' ', ['b1', 'b2'], {}, ' b1', 'b1 '])('rejects malformed branch input %p before querying', async (input) => {
    await expect(service.assertAccess('r1', input as string)).rejects.toBeInstanceOf(BadRequestException);
    expect(findFirst).not.toHaveBeenCalled();
  });
  it('rejects a branch belonging to another restaurant', async () => {
    findFirst.mockResolvedValue(null);
    await expect(service.assertAccess('r1', 'b2')).rejects.toBeInstanceOf(ForbiddenException);
    expect(findFirst).toHaveBeenCalledWith({ where: { id: 'b2', restaurantId: 'r1' }, select: { id: true } });
  });
  it('allows the exact owned branch', async () => {
    findFirst.mockResolvedValue({ id: 'b1' });
    await expect(service.assertAccess('r1', 'b1')).resolves.toBeUndefined();
  });
});
