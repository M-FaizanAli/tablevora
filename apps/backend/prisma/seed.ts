import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSIONS,
  STAFF_ROLES,
} from '@nodedr-restaurant/types';

// Deliberately not imported from src/modules/orders/pricing — the runtime
// image only ships apps/backend/dist + prisma (see ARCHITECTURE.md /
// install.sh packaging notes), so `src/` doesn't exist to import from once
// this script runs via a container's `npx ts-node prisma/seed.ts`. Same
// tax-inclusive math as OrdersService.priceLine, kept tiny and duplicated
// on purpose rather than reaching across that packaging boundary.
function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
function priceLine(
  quantity: number,
  unitPriceInclusive: number,
  taxRatePercent: number,
) {
  const lineTotal = round2(unitPriceInclusive * quantity);
  const rate = taxRatePercent / 100;
  const taxAmount = rate > 0 ? round2(lineTotal - lineTotal / (1 + rate)) : 0;
  return { lineTotal, taxAmount };
}
// The demo branch uses US sales tax (EXCLUSIVE): menu prices are pre-tax and
// get grossed up first, exactly like toEffectiveInclusiveUnitPrice in pricing.ts.
function inclusiveUnitPrice(price: number, taxRatePercent: number) {
  return round2(price * (1 + taxRatePercent / 100));
}

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.DEMO_MODE !== 'true') throw new Error('Demo seeding requires DEMO_MODE=true in production');
  console.log('Seeding permissions...');
  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      update: { label: permission.label, category: permission.category },
      create: permission,
    });
  }
  const allPermissions = await prisma.permission.findMany();
  const permissionByKey = new Map(allPermissions.map((p) => [p.key, p]));

  console.log('Creating demo restaurant + branch...');
  // The public demo presents an international (US) restaurant. Currency, tax
  // and loyalty are also written on update so re-seeding an existing demo
  // database converts it in place.
  const demoLocale = {
    currency: 'USD',
    timezone: 'America/New_York',
    loyaltyEarnPerCurrency: 1, // 1 point per $1 spent
    loyaltyPointValue: 0.01, // 100 points = $1
  };
  const restaurant = await prisma.restaurant.upsert({
    where: { id: 'demo-restaurant' },
    update: demoLocale,
    create: {
      id: 'demo-restaurant',
      name: 'The Greenhouse · Tablevora Demo',
      ...demoLocale,
    },
  });

  const demoTax = {
    country: 'US',
    taxRegime: 'US_SALES_TAX',
    taxMode: 'EXCLUSIVE',
    taxLabel: 'Sales Tax',
  } as const;
  const branch = await prisma.branch.upsert({
    where: { id: 'demo-branch' },
    update: demoTax,
    create: {
      id: 'demo-branch',
      restaurantId: restaurant.id,
      name: 'Main Branch',
      address: '123 Demo Street, New York, NY',
      ...demoTax,
    },
  });

  console.log('Seeding roles...');
  const roleByName = new Map<string, string>();
  for (const roleName of STAFF_ROLES) {
    const role = await prisma.role.upsert({
      where: {
        restaurantId_name: { restaurantId: restaurant.id, name: roleName },
      },
      update: {},
      create: {
        restaurantId: restaurant.id,
        name: roleName,
        label: roleName.replace(/_/g, ' '),
      },
    });
    roleByName.set(roleName, role.id);

    const grantedKeys = DEFAULT_ROLE_PERMISSIONS[roleName];
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: grantedKeys
        .map((key) => permissionByKey.get(key))
        .filter((p): p is NonNullable<typeof p> => Boolean(p))
        .map((permission) => ({
          roleId: role.id,
          permissionId: permission.id,
        })),
    });
  }

  console.log(
    'Creating demo owner user (login: owner@demo.local / password: Password123!)...',
  );
  const passwordHash = await bcrypt.hash('Password123!', 12);
  const pinHash = await bcrypt.hash('1234', 12);
  const ownerRoleId = roleByName.get('OWNER')!;

  const owner = await prisma.user.upsert({
    where: {
      restaurantId_email: {
        restaurantId: restaurant.id,
        email: 'owner@demo.local',
      },
    },
    update: {},
    create: {
      restaurantId: restaurant.id,
      roleId: ownerRoleId,
      name: 'Demo Owner',
      email: 'owner@demo.local',
      passwordHash,
      pinHash,
    },
  });

  await prisma.userBranch.upsert({
    where: { userId_branchId: { userId: owner.id, branchId: branch.id } },
    update: {},
    create: { userId: owner.id, branchId: branch.id },
  });

  console.log('Seeding floor + tables...');
  const floor = await prisma.floor.upsert({
    where: { id: 'demo-floor' },
    update: {},
    create: { id: 'demo-floor', branchId: branch.id, name: 'Ground Floor' },
  });

  for (let i = 1; i <= 8; i++) {
    await prisma.table.upsert({
      where: { floorId_number: { floorId: floor.id, number: String(i) } },
      update: {},
      create: {
        floorId: floor.id,
        number: String(i),
        name: `Table ${i}`,
        capacity: i % 3 === 0 ? 6 : 4,
        posX: ((i - 1) % 4) * 120 + 20,
        posY: Math.floor((i - 1) / 4) * 120 + 20,
      },
    });
  }

  console.log('Seeding kitchen stations + menu...');
  const mainKitchen = await prisma.kitchenStation.upsert({
    where: { id: 'demo-station-main' },
    update: {},
    create: {
      id: 'demo-station-main',
      branchId: branch.id,
      name: 'Main Kitchen',
    },
  });
  const bar = await prisma.kitchenStation.upsert({
    where: { id: 'demo-station-bar' },
    update: {},
    create: { id: 'demo-station-bar', branchId: branch.id, name: 'Bar' },
  });

  const starters = await prisma.menuCategory.upsert({
    where: { id: 'demo-cat-starters' },
    update: {},
    create: {
      id: 'demo-cat-starters',
      branchId: branch.id,
      name: 'Starters',
      sortOrder: 0,
    },
  });
  const mains = await prisma.menuCategory.upsert({
    where: { id: 'demo-cat-mains' },
    update: {},
    create: {
      id: 'demo-cat-mains',
      branchId: branch.id,
      name: 'Main Course',
      sortOrder: 1,
    },
  });
  const drinks = await prisma.menuCategory.upsert({
    where: { id: 'demo-cat-drinks' },
    update: {},
    create: {
      id: 'demo-cat-drinks',
      branchId: branch.id,
      name: 'Drinks',
      sortOrder: 2,
    },
  });

  const crustGroup = await prisma.modifierGroup.upsert({
    where: { id: 'demo-mg-crust' },
    update: {},
    create: {
      id: 'demo-mg-crust',
      branchId: branch.id,
      name: 'Crust Type',
      minSelect: 1,
      maxSelect: 1,
      isRequired: true,
      modifiers: {
        connectOrCreate: [
          {
            where: { id: 'demo-mod-thin' },
            create: {
              id: 'demo-mod-thin',
              name: 'Thin Crust',
              priceAdjustment: 0,
              isDefault: true,
            },
          },
          {
            where: { id: 'demo-mod-thick' },
            create: {
              id: 'demo-mod-thick',
              name: 'Thick Crust',
              priceAdjustment: 0,
            },
          },
          {
            where: { id: 'demo-mod-cheese' },
            create: {
              id: 'demo-mod-cheese',
              name: 'Extra Cheese',
              priceAdjustment: 1.5,
            },
          },
        ],
      },
    },
  });
  // connectOrCreate leaves an existing modifier alone; keep its price in USD.
  await prisma.modifier.update({
    where: { id: 'demo-mod-cheese' },
    data: { priceAdjustment: 1.5 },
  });

  const demoItems: {
    id: string;
    name: string;
    categoryId: string;
    stationId: string;
    price: number;
    taxRatePercent: number;
    isVeg: boolean;
    modifierGroupId?: string;
  }[] = [
    {
      id: 'demo-item-caesar-salad',
      name: 'Caesar Salad',
      categoryId: starters.id,
      stationId: mainKitchen.id,
      price: 11,
      taxRatePercent: 8,
      isVeg: false,
    },
    {
      id: 'demo-item-fish-tacos',
      name: 'Fish Tacos',
      categoryId: starters.id,
      stationId: mainKitchen.id,
      price: 13,
      taxRatePercent: 8,
      isVeg: false,
    },
    {
      id: 'demo-item-margherita',
      name: 'Margherita Pizza',
      categoryId: mains.id,
      stationId: mainKitchen.id,
      price: 14,
      taxRatePercent: 8,
      isVeg: true,
      modifierGroupId: crustGroup.id,
    },
    {
      id: 'demo-item-cheeseburger',
      name: 'Classic Cheeseburger',
      categoryId: mains.id,
      stationId: mainKitchen.id,
      price: 15,
      taxRatePercent: 8,
      isVeg: false,
    },
    {
      id: 'demo-item-iced-latte',
      name: 'Iced Latte',
      categoryId: drinks.id,
      stationId: bar.id,
      price: 5,
      taxRatePercent: 8,
      isVeg: true,
    },
    {
      id: 'demo-item-lemonade',
      name: 'Fresh Lemonade',
      categoryId: drinks.id,
      stationId: bar.id,
      price: 4.5,
      taxRatePercent: 8,
      isVeg: true,
    },
  ];

  // Earlier demo databases were seeded with an Indian menu in INR; hide those
  // items (orders that reference them keep working) instead of deleting them.
  await prisma.menuItem.updateMany({
    where: {
      id: {
        in: [
          'demo-item-paneer-tikka',
          'demo-item-chicken-65',
          'demo-item-butter-chicken',
          'demo-item-mojito',
          'demo-item-cola',
        ],
      },
    },
    data: { isActive: false },
  });

  for (const item of demoItems) {
    await prisma.menuItem.upsert({
      where: { id: item.id },
      // refresh price/tax so a re-seed corrects items kept from the INR menu (Margherita)
      update: {
        name: item.name,
        price: item.price,
        taxRatePercent: item.taxRatePercent,
        isVeg: item.isVeg,
        isActive: true,
      },
      create: {
        id: item.id,
        branchId: branch.id,
        categoryId: item.categoryId,
        stationId: item.stationId,
        name: item.name,
        price: item.price,
        taxRatePercent: item.taxRatePercent,
        isVeg: item.isVeg,
        ...(item.modifierGroupId
          ? {
              modifierGroups: {
                create: [{ modifierGroupId: item.modifierGroupId }],
              },
            }
          : {}),
      },
    });
  }

  console.log('Seeding takeaway demo orders...');
  const itemById = new Map(demoItems.map((i) => [i.id, i]));

  const demoOrders: {
    id: string;
    orderNumber: string;
    paid: boolean;
    lines: { itemId: string; quantity: number }[];
  }[] = [
    {
      // Phoned in, sent to the kitchen, still waiting for pickup — shows up
      // live on the Kitchen Display with no table attached.
      id: 'demo-order-us-takeaway-1',
      orderNumber: 'TA-DEMO-0101',
      paid: false,
      lines: [
        { itemId: 'demo-item-fish-tacos', quantity: 1 },
        { itemId: 'demo-item-lemonade', quantity: 2 },
      ],
    },
    {
      // Already picked up and paid — shows takeaway flowing all the way
      // through checkout, not just the kitchen side.
      id: 'demo-order-us-takeaway-2',
      orderNumber: 'TA-DEMO-0102',
      paid: true,
      lines: [
        { itemId: 'demo-item-cheeseburger', quantity: 1 },
        { itemId: 'demo-item-iced-latte', quantity: 1 },
      ],
    },
  ];

  for (const demoOrder of demoOrders) {
    const lines = demoOrder.lines.map((line) => {
      const item = itemById.get(line.itemId)!;
      const unitPrice = inclusiveUnitPrice(item.price, item.taxRatePercent);
      const priced = priceLine(line.quantity, unitPrice, item.taxRatePercent);
      return { item, unitPrice, quantity: line.quantity, priced };
    });
    const subtotal = round2(
      lines.reduce((sum, l) => sum + l.priced.lineTotal, 0),
    );
    const taxAmount = round2(
      lines.reduce((sum, l) => sum + l.priced.taxAmount, 0),
    );
    const itemStatus = demoOrder.paid ? 'SERVED' : 'NEW';

    const order = await prisma.order.upsert({
      where: { id: demoOrder.id },
      update: {},
      create: {
        id: demoOrder.id,
        branchId: branch.id,
        orderNumber: demoOrder.orderNumber,
        type: 'TAKEAWAY',
        status: demoOrder.paid ? 'PAID' : 'OPEN',
        createdById: owner.id,
        subtotal,
        taxAmount,
        totalAmount: subtotal,
        billedAt: demoOrder.paid ? new Date() : null,
        ...(demoOrder.paid
          ? { payments: { create: [{ method: 'CASH', amount: subtotal }] } }
          : {}),
      },
    });

    const itemsByStation = new Map<string | null, { id: string }[]>();
    for (const [idx, line] of lines.entries()) {
      const orderItem = await prisma.orderItem.upsert({
        where: { id: `${demoOrder.id}-item-${idx}` },
        update: {},
        create: {
          id: `${demoOrder.id}-item-${idx}`,
          orderId: order.id,
          menuItemId: line.item.id,
          nameSnapshot: line.item.name,
          unitPriceSnapshot: line.unitPrice,
          taxRateSnapshot: line.item.taxRatePercent,
          quantity: line.quantity,
          lineTotal: line.priced.lineTotal,
          status: itemStatus,
        },
      });
      const bucket = itemsByStation.get(line.item.stationId) ?? [];
      bucket.push({ id: orderItem.id });
      itemsByStation.set(line.item.stationId, bucket);
    }

    let ticketSeq = 1;
    for (const [stationId, items] of itemsByStation) {
      const kot = await prisma.kot.upsert({
        where: { id: `${demoOrder.id}-kot-${ticketSeq}` },
        update: {},
        create: {
          id: `${demoOrder.id}-kot-${ticketSeq}`,
          orderId: order.id,
          stationId: stationId ?? undefined,
          ticketNumber: `${demoOrder.orderNumber}-${ticketSeq}`,
          status: itemStatus,
          ...(demoOrder.paid
            ? {
                acceptedAt: new Date(),
                readyAt: new Date(),
                servedAt: new Date(),
              }
            : {}),
        },
      });
      ticketSeq += 1;
      for (const item of items) {
        await prisma.kotItem.upsert({
          where: { id: `${kot.id}-${item.id}` },
          update: {},
          create: {
            id: `${kot.id}-${item.id}`,
            kotId: kot.id,
            orderItemId: item.id,
            status: itemStatus,
          },
        });
      }
    }
  }

  console.log('Seed complete.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
