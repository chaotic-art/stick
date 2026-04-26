import { createPublicClient, http, type Address, type Hex } from 'viem'
import { REVIVE_EVM_RPC_URL, REVIVE_REGISTRY_ADDRESS } from '../../environment'
import { normalizeEvmAddress } from './helpers'
import { erc721Abi } from './abi/erc721'
import { registryAbi } from './abi/registry'

type RegistryCollectionResult =
  | {
      collectionAddress: Address
      deployer: Address
      name: string
      createdAt: bigint
    }
  | readonly [Address, Address, string, bigint]

let client: ReturnType<typeof createPublicClient> | undefined

function getClient() {
  if (!REVIVE_EVM_RPC_URL) {
    throw new Error('REVIVE_EVM_RPC_URL is required when REVIVE_ENABLED=true')
  }

  client ??= createPublicClient({
    transport: http(REVIVE_EVM_RPC_URL),
  })

  return client
}

function getRegistryAddress(): Address {
  if (!REVIVE_REGISTRY_ADDRESS) {
    throw new Error('REVIVE_REGISTRY_ADDRESS is required when REVIVE_ENABLED=true')
  }

  return REVIVE_REGISTRY_ADDRESS as Address
}

function asRegistryCollection(result: RegistryCollectionResult) {
  if (Array.isArray(result)) {
    const [collectionAddress, deployer, name, createdAt] = result
    return { collectionAddress, deployer, name, createdAt }
  }

  const value = result as {
    collectionAddress: Address
    deployer: Address
    name: string
    createdAt: bigint
  }

  return {
    collectionAddress: value.collectionAddress,
    deployer: value.deployer,
    name: value.name,
    createdAt: value.createdAt,
  }
}

export async function readRegistryCollection(index: bigint, blockNumber?: bigint) {
  const result = (await getClient().readContract({
    address: getRegistryAddress(),
    abi: registryAbi,
    functionName: 'getCollection',
    args: [index],
    blockNumber,
  })) as RegistryCollectionResult

  const collection = asRegistryCollection(result)

  return {
    collectionAddress: normalizeEvmAddress(collection.collectionAddress),
    deployer: normalizeEvmAddress(collection.deployer),
    name: collection.name,
    createdAt: collection.createdAt,
  }
}

export async function readCollectionOwner(address: string, blockNumber?: bigint): Promise<string> {
  try {
    const owner = (await getClient().readContract({
      address: address as Address,
      abi: erc721Abi,
      functionName: 'owner',
      blockNumber,
    })) as Hex

    return normalizeEvmAddress(owner)
  } catch {
    return ''
  }
}

export async function readContractUri(address: string, blockNumber?: bigint): Promise<string> {
  try {
    return (await getClient().readContract({
      address: address as Address,
      abi: erc721Abi,
      functionName: 'contractURI',
      blockNumber,
    })) as string
  } catch {
    return ''
  }
}

export async function readTokenUri(
  address: string,
  tokenId: bigint,
  blockNumber?: bigint,
): Promise<string> {
  try {
    return (await getClient().readContract({
      address: address as Address,
      abi: erc721Abi,
      functionName: 'tokenURI',
      args: [tokenId],
      blockNumber,
    })) as string
  } catch {
    return ''
  }
}
