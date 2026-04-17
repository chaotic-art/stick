import 'reflect-metadata'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  getOptionalMock,
  getWithMock,
  warnMock,
  pendingMock,
  successMock,
  calculateCollectionOwnerCountAndDistributionMock,
  calculateCollectionFloorMock,
  createEventMock,
} = vi.hoisted(() => ({
  getOptionalMock: vi.fn(),
  getWithMock: vi.fn(),
  warnMock: vi.fn(),
  pendingMock: vi.fn(),
  successMock: vi.fn(),
  calculateCollectionOwnerCountAndDistributionMock: vi.fn(),
  calculateCollectionFloorMock: vi.fn(),
  createEventMock: vi.fn(),
}))

vi.mock('@kodadot1/metasquid/entity', () => ({
  getOptional: getOptionalMock,
  getWith: getWithMock,
}))

vi.mock('../src/mappings/utils/logger', () => ({
  warn: warnMock,
  pending: pendingMock,
  success: successMock,
}))

vi.mock('../src/mappings/utils/helper', () => ({
  calculateCollectionOwnerCountAndDistribution: calculateCollectionOwnerCountAndDistributionMock,
  calculateCollectionFloor: calculateCollectionFloorMock,
}))

vi.mock('../src/mappings/shared/event', () => ({
  createEvent: createEventMock,
}))

vi.mock('../src/model', () => {
  class CollectionEntity {}
  class NFTEntity {}
  return {
    CollectionEntity,
    NFTEntity,
    Interaction: {
      SEND: 'SEND',
      BURN: 'BURN',
    },
  }
})

import { handleTokenTransfer } from '../src/mappings/revive/transfer'
import { handleTokenBurn } from '../src/mappings/revive/burn'

const context = {
  block: {
    height: 5660587,
    timestamp: new Date('2026-03-31T10:48:16.000Z').getTime(),
  },
  event: {
    name: 'Revive.ContractEmitted',
  },
  store: {},
} as any

describe('revive handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('skips transfers for unknown collections', async () => {
    getOptionalMock.mockResolvedValue(undefined)

    await handleTokenTransfer(context, {
      contractAddress: '0x329aaa5b6bea94e750b2dacba74bf41291e6c2bd',
      from: '0x1111111111111111111111111111111111111111',
      to: '0x2222222222222222222222222222222222222222',
      tokenId: 1n,
    })

    expect(getWithMock).not.toHaveBeenCalled()
    expect(warnMock).toHaveBeenCalledWith(
      'SEND',
      'Unknown collection 0x329aaa5b6bea94e750b2dacba74bf41291e6c2bd',
    )
  })

  it('skips transfers when the nft was never indexed', async () => {
    getOptionalMock.mockResolvedValue({ id: '0x626b850c1173b7678458c190ca524a71d4fd84d5' })
    getWithMock.mockRejectedValue(new Error('missing nft'))

    await handleTokenTransfer(context, {
      contractAddress: '0x626b850c1173b7678458c190ca524a71d4fd84d5',
      from: '0x1111111111111111111111111111111111111111',
      to: '0x2222222222222222222222222222222222222222',
      tokenId: 10000000000000000000n,
    })

    expect(warnMock).toHaveBeenCalledWith(
      'SEND',
      'Unknown NFT 0x626b850c1173b7678458c190ca524a71d4fd84d5-10000000000000000000',
    )
    expect(createEventMock).not.toHaveBeenCalled()
  })

  it('records the previous owner on successful transfers', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    const entity = {
      id: '0x626b850c1173b7678458c190ca524a71d4fd84d5-1',
      currentOwner: '0x1111111111111111111111111111111111111111',
      metadata: 'ipfs://token.json',
      updatedAt: null,
      collection: {
        id: '0x626b850c1173b7678458c190ca524a71d4fd84d5',
        ownerCount: 0,
        distribution: 0,
        updatedAt: null,
      },
    }

    getOptionalMock.mockResolvedValue({ id: entity.collection.id })
    getWithMock.mockResolvedValue(entity)
    calculateCollectionOwnerCountAndDistributionMock.mockResolvedValue({
      ownerCount: 3,
      distribution: 2,
    })

    await handleTokenTransfer(
      {
        ...context,
        store: { save },
      },
      {
        contractAddress: entity.collection.id,
        from: '0x1111111111111111111111111111111111111111',
        to: '0x2222222222222222222222222222222222222222',
        tokenId: 1n,
      },
    )

    expect(entity.currentOwner).toBe('0x2222222222222222222222222222222222222222')
    expect(createEventMock).toHaveBeenCalledWith(
      entity,
      'SEND',
      expect.objectContaining({
        caller: '0x1111111111111111111111111111111111111111',
      }),
      'ipfs://token.json',
      { save },
      '0x1111111111111111111111111111111111111111',
    )
  })

  it('skips burns when the nft was never indexed', async () => {
    getOptionalMock.mockResolvedValue({ id: '0x626b850c1173b7678458c190ca524a71d4fd84d5' })
    getWithMock.mockRejectedValue(new Error('missing nft'))

    await handleTokenBurn(context, {
      contractAddress: '0x626b850c1173b7678458c190ca524a71d4fd84d5',
      from: '0x1111111111111111111111111111111111111111',
      to: '0x0000000000000000000000000000000000000000',
      tokenId: 10000000000000000000n,
    })

    expect(warnMock).toHaveBeenCalledWith(
      'BURN',
      'Unknown NFT 0x626b850c1173b7678458c190ca524a71d4fd84d5-10000000000000000000',
    )
    expect(createEventMock).not.toHaveBeenCalled()
  })
})
