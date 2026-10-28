import { BadRequestException } from '@nestjs/common';
import { SettingsService } from './settings.service';

describe('SettingsService currency changes', () => {
  const prisma = {
    restaurant: {
      findUniqueOrThrow: jest.fn().mockResolvedValue({ currency: 'INR' }),
      update: jest.fn().mockResolvedValue({ currency: 'USD' }),
    },
    menuItem: { count: jest.fn().mockResolvedValue(0) },
    order: { count: jest.fn().mockResolvedValue(0) },
    customer: { count: jest.fn().mockResolvedValue(0) },
    giftCard: { count: jest.fn().mockResolvedValue(0) },
  };
  const audit = { record: jest.fn() };
  const service = new SettingsService(prisma as never, audit as never);

  beforeEach(() => jest.clearAllMocks());

  it('allows a new restaurant to choose its accounting currency', async () => {
    await expect(service.updateRestaurant('r1', 'u1', { currency: 'USD' })).resolves.toEqual({ currency: 'USD' });
    expect(prisma.restaurant.update).toHaveBeenCalledTimes(1);
  });

  it('rejects a currency change when prices already exist', async () => {
    prisma.menuItem.count.mockResolvedValueOnce(1);
    await expect(service.updateRestaurant('r1', 'u1', { currency: 'USD' }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.restaurant.update).not.toHaveBeenCalled();
  });
});
