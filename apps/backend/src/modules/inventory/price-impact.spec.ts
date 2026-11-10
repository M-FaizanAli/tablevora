import { NotFoundException } from '@nestjs/common';
import { InventoryService } from './inventory.service';

describe('ingredient price impact', () => {
  const prisma = {
    ingredient: { findFirst: jest.fn() },
    menuItem: { findMany: jest.fn().mockResolvedValue([]) },
  };
  const service = new InventoryService(prisma as never, {} as never);

  beforeEach(() => jest.clearAllMocks());

  it('scopes affected items and their recipe costs to the branch', async () => {
    prisma.ingredient.findFirst.mockResolvedValue({ id: 'i1' });
    await service.priceImpact('b1', 'i1');
    expect(prisma.ingredient.findFirst).toHaveBeenCalledWith({ where: { id: 'i1', branchId: 'b1' } });
    expect(prisma.menuItem.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ branchId: 'b1', recipeLines: { some: { ingredientId: 'i1' } } }),
      select: expect.objectContaining({ recipeLines: expect.objectContaining({ where: { ingredient: { branchId: 'b1' } } }) }),
    }));
  });

  it('rejects an ingredient outside the branch before listing items', async () => {
    prisma.ingredient.findFirst.mockResolvedValue(null);
    await expect(service.priceImpact('b1', 'other')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.menuItem.findMany).not.toHaveBeenCalled();
  });
});
