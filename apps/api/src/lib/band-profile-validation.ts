import { z } from 'zod'

export const optionalUrl = z.preprocess(
  (val) => (val === '' || val === null || val === undefined ? undefined : val),
  z.string().url('Must be a valid URL').optional(),
)

export const addressInputSchema = z.object({
  addressLine1: z.string().min(1, 'Street address is required'),
  addressLine2: z.preprocess((val) => (val === '' ? undefined : val), z.string().optional()),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipcode: z.string().min(3, 'Postal code must be at least 3 characters').max(10, 'Postal code must be at most 10 characters'),
  country: z.string().default('US'),
})

export const socialLinksInputSchema = z.object({
  websiteUrl: optionalUrl,
  facebookUrl: optionalUrl,
  instagramUrl: optionalUrl,
  xUrl: optionalUrl,
  tiktokUrl: optionalUrl,
  youtubeUrl: optionalUrl,
})

const businessTypeSchema = z.enum(['MEDICAL_SPA'])
const serviceIdSchema = z.enum([
  'BOTOX', 'FILLERS', 'LASER_HAIR', 'LASER_SKIN', 'CHEMICAL_PEEL', 'MICRONEEDLING',
  'BODY_CONTOURING', 'IV_THERAPY', 'SKIN_REJUVENATION', 'MEDICAL_FACIAL', 'OTHER',
])
const productIdSchema = z.enum([
  'HIGHLEVEL_CRM', 'CRM_SETUP', 'PIPELINE_AUTOMATION', 'WEBSITE_FUNNEL', 'REPUTATION',
  'SMS_EMAIL', 'CATBOT_TRAINING', 'OTHER',
])

export const businessBandCreateInputSchema = z
  .object({
    userId: z.string(),
    name: z.string().min(2, 'Business name must be at least 2 characters'),
    businessType: businessTypeSchema,
    description: z.string().min(10, 'Description must be at least 10 characters'),
    mission: z.string().min(10, 'Mission must be at least 10 characters'),
    values: z.string().min(1, 'Please enter at least one value'),
    servicesOffered: z.array(serviceIdSchema).min(1, 'Select at least one service'),
    servicesOther: z.preprocess((val) => (val === '' ? undefined : val), z.string().optional()),
    serviceAreaMiles: z.number().int().min(1).max(500),
    logoUrl: optionalUrl,
    parentBandId: z.string().optional(),
  })
  .merge(addressInputSchema)
  .merge(socialLinksInputSchema)
  .refine(
    (data) => !data.servicesOffered.includes('OTHER') || (data.servicesOther && data.servicesOther.trim().length > 0),
    { message: 'Please describe other services', path: ['servicesOther'] },
  )

export const businessBandUpdateInputSchema = z.object({
  bandId: z.string(),
  userId: z.string(),
  name: z.string().min(2).optional(),
  businessType: businessTypeSchema.optional(),
  description: z.string().min(10).optional(),
  mission: z.string().min(10).optional(),
  values: z.string().min(1).optional(),
  servicesOffered: z.array(serviceIdSchema).min(1).optional(),
  servicesOther: z.preprocess((val) => (val === '' ? undefined : val), z.string().optional()),
  serviceAreaMiles: z.number().int().min(1).max(500).optional(),
  logoUrl: optionalUrl.nullable(),
  addressLine1: z.string().min(1).optional(),
  addressLine2: z.preprocess((val) => (val === '' ? undefined : val), z.string().optional()),
  city: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  zipcode: z.string().min(3).max(10).optional(),
  country: z.string().optional(),
  websiteUrl: optionalUrl.nullable(),
  facebookUrl: optionalUrl.nullable(),
  instagramUrl: optionalUrl.nullable(),
  xUrl: optionalUrl.nullable(),
  tiktokUrl: optionalUrl.nullable(),
  youtubeUrl: optionalUrl.nullable(),
})

export const agencyBigBandCreateInputSchema = z
  .object({
    adminUserId: z.string(),
    founderId: z.string(),
    name: z.string().min(2, 'Agency name must be at least 2 characters'),
    mission: z.string().min(10, 'Mission must be at least 10 characters'),
    productsOffered: z.array(productIdSchema).min(1, 'Select at least one product'),
    productsOther: z.preprocess((val) => (val === '' ? undefined : val), z.string().optional()),
    clientSearchRadiusMiles: z.number().int().min(1).max(500),
    logoUrl: optionalUrl,
  })
  .merge(addressInputSchema)
  .merge(socialLinksInputSchema)
  .refine(
    (data) => !data.productsOffered.includes('OTHER') || (data.productsOther && data.productsOther.trim().length > 0),
    { message: 'Please describe other products', path: ['productsOther'] },
  )

export function parseCommaValues(values: string): string[] {
  return values.split(',').map((v) => v.trim()).filter(Boolean)
}

export function mapSocialLinks(input: z.infer<typeof socialLinksInputSchema>) {
  return {
    websiteUrl: input.websiteUrl ?? null,
    facebookUrl: input.facebookUrl ?? null,
    instagramUrl: input.instagramUrl ?? null,
    xUrl: input.xUrl ?? null,
    tiktokUrl: input.tiktokUrl ?? null,
    youtubeUrl: input.youtubeUrl ?? null,
  }
}

export function mapAddress(input: z.infer<typeof addressInputSchema>) {
  return {
    addressLine1: input.addressLine1,
    addressLine2: input.addressLine2 ?? null,
    city: input.city,
    state: input.state,
    zipcode: input.zipcode,
    country: input.country ?? 'US',
  }
}
