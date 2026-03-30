export type Chain = 'kusama' | 'polkadot' | 'paseo'
export type GetterChain = 'kusama' | 'polkadot'

export const CHAIN: Chain = (process.env.CHAIN as Chain) || 'kusama'
export const COLLECTION_OFFER: string = process.env.OFFER || ''

function asNonNegativeInteger(value: string | undefined, fallback: number): number {
  if (value === undefined) {
    return fallback
  }

  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback
  }

  return parsed
}

function normalizeAddress(value: string | undefined): string {
  return value?.trim().toLowerCase() || ''
}

export const UNIQUES_ENABLED = process.env.UNIQUES_ENABLED === 'true'
export const REVIVE_ENABLED = process.env.REVIVE_ENABLED === 'true'

const DEFAULT_UNIQUE_STARTING_BLOCK = CHAIN === 'paseo' ? 360_613 : 323_750
const DEFAULT_NFT_STARTING_BLOCK = CHAIN === 'paseo' ? 142_362 : 4_556_552

export const UNIQUE_STARTING_BLOCK = asNonNegativeInteger(
  process.env.UNIQUE_STARTING_BLOCK,
  DEFAULT_UNIQUE_STARTING_BLOCK,
)
export const _NFT_STARTING_BLOCK = asNonNegativeInteger(
  process.env.STARTING_BLOCK,
  DEFAULT_NFT_STARTING_BLOCK,
)

const PALLET_STARTING_BLOCK = UNIQUES_ENABLED ? UNIQUE_STARTING_BLOCK : _NFT_STARTING_BLOCK
export const REVIVE_START_BLOCK = asNonNegativeInteger(
  process.env.REVIVE_START_BLOCK,
  PALLET_STARTING_BLOCK,
)
export const STARTING_BLOCK = REVIVE_ENABLED
  ? Math.min(PALLET_STARTING_BLOCK, REVIVE_START_BLOCK)
  : PALLET_STARTING_BLOCK

export const REVIVE_REGISTRY_ADDRESS = normalizeAddress(process.env.REVIVE_REGISTRY_ADDRESS)
export const REVIVE_EVM_RPC_URL = process.env.REVIVE_EVM_RPC_URL || ''
export const GETTER_CHAIN: GetterChain = CHAIN === 'kusama' ? 'kusama' : 'polkadot'
export const SS58_PREFIX = CHAIN === 'kusama' ? 2 : 0

export const RARITY_BACKFILL_ENABLED = process.env.RARITY_BACKFILL_ENABLED === 'true'
export const RARITY_BACKFILL_PER_BATCH = asNonNegativeInteger(process.env.RARITY_BACKFILL_PER_BATCH, 10)
export const NFT_ATTRIBUTE_BACKFILL_ENABLED = process.env.NFT_ATTRIBUTE_BACKFILL_ENABLED === 'true'
export const NFT_ATTRIBUTE_BACKFILL_PER_BATCH = asNonNegativeInteger(process.env.NFT_ATTRIBUTE_BACKFILL_PER_BATCH, 100)

const ARCHIVE_URL = `https://v2.archive.subsquid.io/network/asset-hub-${CHAIN}`
const NODE_URL = process.env.NODE_URL || `wss://${CHAIN}-asset-hub-rpc.polkadot.io`

export const isProd = CHAIN !== 'paseo'

console.table({
  CHAIN,
  ARCHIVE_URL,
  NODE_URL,
  STARTING_BLOCK,
  UNIQUE_STARTING_BLOCK,
  _NFT_STARTING_BLOCK,
  GETTER_CHAIN,
  COLLECTION_OFFER,
  UNIQUES_ENABLED,
  REVIVE_ENABLED,
  REVIVE_START_BLOCK,
  REVIVE_REGISTRY_ADDRESS,
  REVIVE_EVM_RPC_URL,
  RARITY_BACKFILL_ENABLED,
  RARITY_BACKFILL_PER_BATCH,
  NFT_ATTRIBUTE_BACKFILL_ENABLED,
  NFT_ATTRIBUTE_BACKFILL_PER_BATCH,
  disabledRPC: false,
  environment: isProd ? 'production' : 'development',
})

export const getArchiveUrl = (): string => ARCHIVE_URL
export const getNodeUrl = (): string => NODE_URL
