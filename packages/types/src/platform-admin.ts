import { z } from "zod";

export const restaurantLifecycleStatusSchema = z.enum([
  "PENDING",
  "ACTIVE",
  "READ_ONLY",
  "DECLINED",
]);
export type RestaurantLifecycleStatus = z.infer<
  typeof restaurantLifecycleStatusSchema
>;

export const platformAdminBootstrapSchema = z
  .object({
    bootstrapSecret: z.string().min(32).max(512),
    email: z.string().email().max(254),
    name: z.string().trim().min(1).max(120),
    password: z.string().min(12).max(200),
  })
  .strict();
export type PlatformAdminBootstrapDto = z.infer<
  typeof platformAdminBootstrapSchema
>;

export const platformAdminBootstrapConfirmSchema = z
  .object({
    challengeToken: z.string().min(32).max(128),
    code: z.string().trim().min(6).max(20),
  })
  .strict();
export type PlatformAdminBootstrapConfirmDto = z.infer<
  typeof platformAdminBootstrapConfirmSchema
>;

export const platformAdminLoginSchema = z
  .object({
    email: z.string().email().max(254),
    password: z.string().min(1).max(200),
    code: z.string().trim().min(6).max(20).optional(),
  })
  .strict();
export type PlatformAdminLoginDto = z.infer<typeof platformAdminLoginSchema>;

export const tenantSignupResultSchema = z.object({
  status: z.literal("PENDING"),
});
export type TenantSignupResult = z.infer<typeof tenantSignupResultSchema>;

export const platformRestaurantStatusUpdateSchema = z
  .object({
    status: z.enum(["ACTIVE", "READ_ONLY", "DECLINED"]),
  })
  .strict();
export type PlatformRestaurantStatusUpdate = z.infer<
  typeof platformRestaurantStatusUpdateSchema
>;

export const platformRestaurantCreateSchema = z
  .object({
    restaurantName: z.string().trim().min(2).max(120),
    branchName: z.string().trim().min(2).max(120),
    ownerName: z.string().trim().min(2).max(120),
    ownerEmail: z.string().email().max(254),
  })
  .strict();
export type PlatformRestaurantCreateDto = z.infer<
  typeof platformRestaurantCreateSchema
>;

export const platformInviteTokenSchema = z
  .object({ token: z.string().min(32).max(128) })
  .strict();
export const platformInviteAcceptSchema = platformInviteTokenSchema.extend({
  password: z.string().min(12).max(200),
});
export type PlatformInviteAcceptDto = z.infer<
  typeof platformInviteAcceptSchema
>;

export const platformRestaurantListQuerySchema = z.object({
  status: restaurantLifecycleStatusSchema.optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type PlatformRestaurantListQuery = z.infer<
  typeof platformRestaurantListQuerySchema
>;

export const platformRestaurantSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  status: restaurantLifecycleStatusSchema,
  createdAt: z.string(),
  owner: z
    .object({ id: z.string(), name: z.string(), email: z.string().nullable() })
    .nullable(),
  branchCount: z.number().int().nonnegative(),
  staffCount: z.number().int().nonnegative(),
});
export type PlatformRestaurantSummary = z.infer<
  typeof platformRestaurantSummarySchema
>;

export const platformRestaurantListSchema = z.object({
  data: z.array(platformRestaurantSummarySchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalPages: z.number().int().positive(),
});
export type PlatformRestaurantList = z.infer<
  typeof platformRestaurantListSchema
>;

export const platformAdminSessionSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
});
export type PlatformAdminSession = z.infer<typeof platformAdminSessionSchema>;

export const platformAdminAuditEntrySchema = z.object({
  id: z.string(),
  actorName: z.string().nullable(),
  restaurantId: z.string().nullable(),
  action: z.string(),
  metadata: z.unknown().nullable(),
  createdAt: z.string(),
});
export type PlatformAdminAuditEntry = z.infer<
  typeof platformAdminAuditEntrySchema
>;
