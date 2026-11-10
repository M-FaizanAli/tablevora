import { InventoryService } from './inventory.service';

describe('stock review', () => {
  it('flags low recipe and direct stock and retains unavailable tracked items', async () => {
    const ingredient = { id: 'i', branchId: 'b', name: 'Rice', unit: 'KG', currentStock: '2', reorderLevel: '1' };
    const findMany = jest.fn().mockResolvedValue([
      { id: 'recipe', name: 'Rice bowl', isActive: true, inventoryTracking: 'RECIPE', recipeLines: [{ ingredient, quantity: '3' }] },
      { id: 'direct', name: 'Rice bag', isActive: true, inventoryTracking: 'DIRECT', stockIngredient: { ...ingredient, currentStock: '1' }, stockQuantityPerSale: '1', recipeLines: [] },
      { id: 'off', name: 'Unavailable', isActive: false, inventoryTracking: 'RECIPE', recipeLines: [] },
      { id: 'ok', name: 'Ready', isActive: true, inventoryTracking: 'RECIPE', recipeLines: [{ ingredient, quantity: '1' }] },
    ]);
    const service = new InventoryService({ menuItem: { findMany } } as never, {} as never);
    const result = await service.stockReview('b');
    expect(result.map((item) => item.id)).toEqual(['recipe', 'direct', 'off']);
    expect(result[0].low[0]).toMatchObject({ id: 'i', currentStock: '2', perServing: '3' });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ branchId: 'b' }) }));
  });

  it('uses only paid branch orders for prep averages and excludes inactive items', async () => {
    const groupBy = jest.fn().mockResolvedValue([
      { menuItemId: 'active', _sum: { quantity: 28 } },
      { menuItemId: 'inactive', _sum: { quantity: 14 } },
    ]);
    const findMany = jest.fn().mockResolvedValue([{ id: 'active', name: 'Rice bowl' }]);
    const service = new InventoryService({ orderItem: { groupBy }, menuItem: { findMany } } as never, {} as never);
    expect(await service.prepGuide('b')).toEqual([{ menuItemId: 'active', name: 'Rice bowl', sold28Days: 28, averagePerDay: 1 }]);
    expect(groupBy).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ order: expect.objectContaining({ branchId: 'b', status: 'PAID' }), status: { not: 'CANCELLED' } }) }));
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ branchId: 'b', isActive: true }) }));
  });
});
