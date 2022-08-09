import { Pool__factory } from 'contracts'

export const poolFactory = new Pool__factory()

export const pool = poolFactory.attach(
  process.env.NEXT_PUBLIC_POOL_ADDRESS || '0xe78A0F7E598Cc8b0Bb87894B0F60dD2a88d6a8Ab'
)

export default pool
