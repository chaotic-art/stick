import { describe, expect, it } from 'vitest'
import { encodeAbiParameters, encodeEventTopics } from 'viem'
import {
  collectionIdFromAddress,
  decodeCollectionRegisteredEvent,
  decodeTransferEvent,
  isBurnTransfer,
  isMintTransfer,
  nftIdFromParts,
  normalizeEvmAddress,
} from '../src/mappings/revive/helpers'
import { erc721Abi } from '../src/mappings/revive/abi/erc721'
import { registryAbi } from '../src/mappings/revive/abi/registry'

describe('Revive helpers', () => {
  it('normalizes and namespaces collection ids', () => {
    const address = '0x15D57D3Ec0291715dF00B14b30270050dB28a1BA'
    expect(normalizeEvmAddress(address)).toBe('0x15d57d3ec0291715df00b14b30270050db28a1ba')
    expect(collectionIdFromAddress(address)).toBe('0x15d57d3ec0291715df00b14b30270050db28a1ba')
    expect(nftIdFromParts(address, 42n)).toBe('0x15d57d3ec0291715df00b14b30270050db28a1ba-42')
  })

  it('classifies mint and burn transfers', () => {
    expect(isMintTransfer('0x0000000000000000000000000000000000000000')).toBe(true)
    expect(isMintTransfer('0x0000000000000000000000000000000000000001')).toBe(false)
    expect(isBurnTransfer('0x0000000000000000000000000000000000000000')).toBe(true)
    expect(isBurnTransfer('0x0000000000000000000000000000000000000001')).toBe(false)
  })

  it('decodes registry collection registration events', () => {
    const topics = encodeEventTopics({
      abi: registryAbi,
      eventName: 'CollectionRegistered',
      args: {
        index: 7n,
      },
    })
    const data = encodeAbiParameters(
      [
        { type: 'address', name: 'collectionAddress' },
        { type: 'address', name: 'deployer' },
      ],
      [
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222',
      ],
    )

    const decoded = decodeCollectionRegisteredEvent({
      contract: '0x15D57D3Ec0291715dF00B14b30270050dB28a1BA',
      data,
      topics,
    })

    expect(decoded.contractAddress).toBe('0x15d57d3ec0291715df00b14b30270050db28a1ba')
    expect(decoded.index).toBe(7n)
    expect(decoded.collectionAddress).toBe('0x1111111111111111111111111111111111111111')
    expect(decoded.deployer).toBe('0x2222222222222222222222222222222222222222')
  })

  it('decodes transfer events emitted by revive contracts', () => {
    const topics = encodeEventTopics({
      abi: erc721Abi,
      eventName: 'Transfer',
      args: {
        from: '0x0000000000000000000000000000000000000000',
        to: '0x3333333333333333333333333333333333333333',
        tokenId: 9n,
      },
    })

    const decoded = decodeTransferEvent({
      contract: '0x4444444444444444444444444444444444444444',
      data: '0x',
      topics,
    })

    expect(decoded.contractAddress).toBe('0x4444444444444444444444444444444444444444')
    expect(decoded.from).toBe('0x0000000000000000000000000000000000000000')
    expect(decoded.to).toBe('0x3333333333333333333333333333333333333333')
    expect(decoded.tokenId).toBe(9n)
  })
})
