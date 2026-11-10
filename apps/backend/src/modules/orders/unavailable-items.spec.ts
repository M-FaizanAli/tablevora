import { BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service';

describe('unavailable menu items', () => {
  const item = { menuItemId: 'i', quantity: 1, modifierIds: [] };
  const prisma = {
    menuItem: { findMany: jest.fn() },
    comboComponent: { findMany: jest.fn() },
    order: { findFirst: jest.fn() },
    menuItemModifierGroup: { findMany: jest.fn().mockResolvedValue([]) },
  };
  const service = new OrdersService(prisma as never, {} as never, {} as never, {} as never, {} as never, {} as never, {} as never, {} as never, {} as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.menuItem.findMany.mockImplementation((query: { select?: unknown }) => Promise.resolve(query.select ? [] : [{ id: 'i', name: 'Soup', isActive: false }]));
    prisma.order.findFirst.mockResolvedValue({ status: 'OPEN', payments: [], items: [] });
  });

  it('rejects an unavailable item when staff create an order', async () => {
    await expect(service.createOrder('b', 'u', { type: 'TAKEAWAY', items: [item] } as never)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a stale guest cart when adding to an existing order', async () => {
    await expect(service.addItems('b', 'o', [item] as never, { websiteOnly: true, enforceModifierLimits: true })).rejects.toThrow('no longer available');
  });

  it('rejects a stale guest cart when creating a new order', async () => {
    await expect(service.createOrder('b', 'u', { type: 'QR_ORDER', items: [item] } as never, { channel: 'ONLINE' })).rejects.toThrow('no longer available');
  });

  it('rejects a combo whose component was marked unavailable', async () => {
    prisma.menuItem.findMany.mockResolvedValue([{ id: 'i', name: 'Meal deal', isActive: true, isCombo: true }]);
    prisma.comboComponent.findMany.mockResolvedValue([{ componentItem: { name: 'Soup' } }]);
    await expect(service.createOrder('b', 'u', { type: 'TAKEAWAY', items: [item] } as never)).rejects.toThrow('combo contains an unavailable item');
    expect(prisma.comboComponent.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ comboItem: { branchId: 'b' } }) }));
  });
});
