declare module 'zipcodes' {
  export interface ZipInfo {
    zip: string
    latitude: number
    longitude: number
    city: string
    state: string
    country: string
  }

  const zipcodes: {
    codes: Record<string, ZipInfo>
    lookup(zip: string | number): ZipInfo | undefined
    lookupByName(city: string, state: string): ZipInfo[]
    distance(zipA: string | number, zipB: string | number): number | null
  }

  export default zipcodes
}
