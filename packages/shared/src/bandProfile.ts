/** Business type options for client bands */
export const BUSINESS_TYPES = [
  { id: 'MEDICAL_SPA', label: 'Medical Spa' },
] as const

export type BusinessTypeId = (typeof BUSINESS_TYPES)[number]['id']

/** Predefined services for medical spa businesses */
export const MEDICAL_SPA_SERVICES = [
  { id: 'BOTOX', label: 'Botox / neurotoxins' },
  { id: 'FILLERS', label: 'Dermal fillers' },
  { id: 'LASER_HAIR', label: 'Laser hair removal' },
  { id: 'LASER_SKIN', label: 'Laser skin resurfacing' },
  { id: 'CHEMICAL_PEEL', label: 'Chemical peels' },
  { id: 'MICRONEEDLING', label: 'Microneedling' },
  { id: 'BODY_CONTOURING', label: 'Body contouring' },
  { id: 'IV_THERAPY', label: 'IV therapy' },
  { id: 'SKIN_REJUVENATION', label: 'Skin rejuvenation' },
  { id: 'MEDICAL_FACIAL', label: 'Medical-grade facials' },
  { id: 'OTHER', label: 'Other' },
] as const

/** Agency products around HighLevel CRM */
export const AGENCY_PRODUCTS = [
  { id: 'HIGHLEVEL_CRM', label: 'HighLevel CRM (white-label)' },
  { id: 'CRM_SETUP', label: 'CRM setup & onboarding' },
  { id: 'PIPELINE_AUTOMATION', label: 'Pipeline & automation buildout' },
  { id: 'WEBSITE_FUNNEL', label: 'Website / funnel design' },
  { id: 'REPUTATION', label: 'Reputation management' },
  { id: 'SMS_EMAIL', label: 'SMS / email campaigns' },
  { id: 'CATBOT_TRAINING', label: 'Cat Bot adoption & training' },
  { id: 'OTHER', label: 'Other' },
] as const

export const SERVICE_OTHER_ID = 'OTHER'
export const PRODUCT_OTHER_ID = 'OTHER'

export type StructuredAddress = {
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  zipcode: string
  country?: string
}

export type SocialLinks = {
  websiteUrl?: string
  facebookUrl?: string
  instagramUrl?: string
  xUrl?: string
  tiktokUrl?: string
  youtubeUrl?: string
}
