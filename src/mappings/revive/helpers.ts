import { decodeEventLog, getAddress, type Hex, zeroAddress } from 'viem'
import { BaseCall, Context } from '../utils/types'
import { erc721Abi } from './abi/erc721'
import { registryAbi } from './abi/registry'

export type ReviveLogPayload = {
  contract: string
  data?: Hex
  topics: Hex[]
}

export type DecodedCollectionRegisteredEvent = {
  contractAddress: string
  index: bigint
  collectionAddress: string
  deployer: string
}

export type DecodedTransferEvent = {
  contractAddress: string
  from: string
  to: string
  tokenId: bigint
}

export type DecodedContractUriUpdatedEvent = {
  contractAddress: string
  prevUri: string
  newUri: string
}

export function normalizeEvmAddress(address: string): string {
  try {
    return getAddress(address).toLowerCase()
  } catch {
    return address.trim().toLowerCase()
  }
}

export function collectionIdFromAddress(address: string): string {
  return normalizeEvmAddress(address)
}

export function nftIdFromParts(collectionAddress: string, tokenId: string | bigint): string {
  return `${collectionIdFromAddress(collectionAddress)}-${tokenId.toString()}`
}

export function isMintTransfer(from: string): boolean {
  return normalizeEvmAddress(from) === zeroAddress
}

export function isBurnTransfer(to: string): boolean {
  return normalizeEvmAddress(to) === zeroAddress
}

export function topic0Of(args: unknown): string {
  return getReviveLogPayload(args).topics[0]?.toLowerCase() || ''
}

export function toReviveBaseCall(caller: string, context: Context): BaseCall {
  return {
    caller,
    blockNumber: String(context.block.height),
    timestamp: new Date(context.block.timestamp || Date.now()),
    name: context.event.name,
  }
}

export function decodeCollectionRegisteredEvent(args: unknown): DecodedCollectionRegisteredEvent {
  const payload = getReviveLogPayload(args)
  const decoded = decodeEventLog({
    abi: registryAbi,
    data: payload.data || '0x',
    topics: payload.topics as [Hex, ...Hex[]],
    strict: false,
  })

  const eventArgs = decoded.args as Record<string, unknown>
  return {
    contractAddress: payload.contract,
    index: BigInt(eventArgs.index as bigint | number | string),
    collectionAddress: normalizeEvmAddress(String(eventArgs.collectionAddress)),
    deployer: normalizeEvmAddress(String(eventArgs.deployer)),
  }
}

export function decodeTransferEvent(args: unknown): DecodedTransferEvent {
  const payload = getReviveLogPayload(args)
  const decoded = decodeEventLog({
    abi: erc721Abi,
    data: payload.data || '0x',
    topics: payload.topics as [Hex, ...Hex[]],
    strict: false,
  })

  const eventArgs = decoded.args as Record<string, unknown>
  return {
    contractAddress: payload.contract,
    from: normalizeEvmAddress(String(eventArgs.from)),
    to: normalizeEvmAddress(String(eventArgs.to)),
    tokenId: BigInt(eventArgs.tokenId as bigint | number | string),
  }
}

export function decodeContractUriUpdatedEvent(args: unknown): DecodedContractUriUpdatedEvent {
  const payload = getReviveLogPayload(args)
  const decoded = decodeEventLog({
    abi: erc721Abi,
    data: payload.data || '0x',
    topics: payload.topics as [Hex, ...Hex[]],
    strict: false,
  })

  const eventArgs = decoded.args as Record<string, unknown>
  return {
    contractAddress: payload.contract,
    prevUri: String(eventArgs.prevURI || ''),
    newUri: String(eventArgs.newURI || ''),
  }
}

function getReviveLogPayload(args: unknown): ReviveLogPayload {
  const payload = args as Partial<ReviveLogPayload>
  if (!payload || typeof payload.contract !== 'string' || !Array.isArray(payload.topics)) {
    throw new Error('Invalid Revive.ContractEmitted payload')
  }

  return {
    contract: normalizeEvmAddress(payload.contract),
    data: payload.data as Hex | undefined,
    topics: payload.topics as Hex[],
  }
}
