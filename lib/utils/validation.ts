import { z } from 'zod';

export const RegisterSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phoneNumber: z
    .string()
    .trim()
    .min(7)
    .max(20)
    .regex(/^\+?[0-9][0-9\s()\-]{6,19}$/, 'Invalid phone number format'),
});

export const LoginSchema = z.object({
  email: z.string().email().optional(),
  username: z.string().min(3).max(50).optional(),
  password: z.string(),
}).refine((data) => Boolean(data.email || data.username), {
  message: 'Email or username is required',
});

export const CreateOrderSchema = z.object({
  productId: z.string(),
  playerId: z.string().min(1),
  quantity: z.number().min(1).default(1),
});

export const CreateDepositSchema = z.object({
  amount: z.number().min(0.01),
  currency: z.literal('USD'),
});

export const UpdateProductSchema = z.object({
  productName: z.string().optional(),
  sellingPrice: z.number().optional(),
  activeStatus: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});

export const SyncProductsSchema = z.object({
  category: z.string().optional(),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
export type CreateDepositInput = z.infer<typeof CreateDepositSchema>;
