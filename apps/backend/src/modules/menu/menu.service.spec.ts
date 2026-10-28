import { MenuService } from './menu.service';

describe('MenuService tax defaults', () => {
  const create = jest.fn().mockResolvedValue({ id: 'item' });
  const prisma = {
    branch: { findUniqueOrThrow: jest.fn().mockResolvedValue({ defaultTaxRatePercent: '8.875' }) },
    menuItem: { create },
  };
  const service = new MenuService(prisma as never, {} as never);
  const item = {
    categoryId: 'category',
    name: 'Coffee',
    price: 5,
    modifierGroupIds: [],
  };

  beforeEach(() => create.mockClear());

  it('uses the branch rate when the item has no override', async () => {
    await service.createItem('branch', item as never);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ taxRatePercent: '8.875' }),
    }));
  });

  it('keeps an explicit zero rate for an exempt item', async () => {
    await service.createItem('branch', { ...item, taxRatePercent: 0 } as never);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ taxRatePercent: 0 }),
    }));
  });
});
