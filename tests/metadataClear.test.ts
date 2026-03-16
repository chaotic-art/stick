import 'reflect-metadata'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  currentEvent,
  getMock,
  debugMock,
  warnMock,
  successMock,
  unlinkNftTokenHandlerMock,
  setMetadataHandlerMock,
  markCollectionRarityDirtyMock,
  markNftAttributesDirtyMock,
} = vi.hoisted(() => ({
  currentEvent: { value: undefined as any },
  getMock: vi.fn(),
  debugMock: vi.fn(),
  warnMock: vi.fn(),
  successMock: vi.fn(),
  unlinkNftTokenHandlerMock: vi.fn(),
  setMetadataHandlerMock: vi.fn(),
  markCollectionRarityDirtyMock: vi.fn(),
  markNftAttributesDirtyMock: vi.fn(),
}))

vi.mock('@kodadot1/metasquid/entity', () => ({
  get: getMock,
  getOptional: vi.fn(),
}))

vi.mock('../src/mappings/utils/extract', () => ({
  unwrap: () => currentEvent.value,
}))

vi.mock('../src/mappings/nfts/getters', () => ({
  getMetadataEvent: vi.fn(),
}))

vi.mock('../src/mappings/uniques/getters', () => ({
  getMetadataEvent: vi.fn(),
}))

vi.mock('../src/mappings/shared/token', () => ({
  unlinkNftTokenHandler: unlinkNftTokenHandlerMock,
  setMetadataHandler: setMetadataHandlerMock,
}))

vi.mock('../src/mappings/utils/rarity', () => ({
  markCollectionRarityDirty: markCollectionRarityDirtyMock,
}))

vi.mock('../src/mappings/utils/nftAttributes', async () => {
  const actual = await vi.importActual('../src/mappings/utils/nftAttributes')
  return {
    ...actual,
    markNftAttributesDirty: markNftAttributesDirtyMock,
  }
})

vi.mock('../src/mappings/shared/metadata', () => ({
  handleMetadata: vi.fn(),
}))

vi.mock('../src/mappings/utils/cache', () => ({
  updateItemMetadataByCollection: vi.fn(),
}))

vi.mock('../src/mappings/utils/logger', () => ({
  debug: debugMock,
  warn: warnMock,
  success: successMock,
}))

vi.mock('../src/model', () => {
  class NFTEntity {}
  class CollectionEntity {}
  return {
    NFTEntity,
    CollectionEntity,
    Kind: { mixed: 'mixed' },
  }
})

import { handleMetadataSet as handleNftMetadataSet } from '../src/mappings/nfts/setMetadata'
import { handleMetadataSet as handleUniquesMetadataSet } from '../src/mappings/uniques/setMetadata'

describe('metadata clear handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('clears nft metadata-derived fields and unlinks token grouping for nfts', async () => {
    const nft = {
      id: '1-1',
      metadata: 'ipfs://meta',
      meta: { id: 'meta-id' },
      name: 'Example NFT',
      image: 'ipfs://image',
      media: 'ipfs://media',
    }

    currentEvent.value = {
      collectionId: '1',
      sn: '1',
      metadata: undefined,
    }
    getMock.mockResolvedValue(nft)

    const store = { save: vi.fn().mockResolvedValue(undefined) }

    await handleNftMetadataSet({ store } as any)

    expect(nft.metadata).toBeUndefined()
    expect(nft.meta).toBeUndefined()
    expect(nft.name).toBeUndefined()
    expect(nft.image).toBeUndefined()
    expect(nft.media).toBeUndefined()
    expect(store.save).toHaveBeenCalledWith(nft)
    expect(unlinkNftTokenHandlerMock).toHaveBeenCalledWith({ store }, nft)
    expect(markCollectionRarityDirtyMock).toHaveBeenCalledWith('1')
    expect(markNftAttributesDirtyMock).toHaveBeenCalledWith('1-1')
    expect(setMetadataHandlerMock).not.toHaveBeenCalled()
  })

  it('clears nft metadata-derived fields and unlinks token grouping for uniques', async () => {
    const nft = {
      id: '2-9',
      metadata: 'ipfs://meta',
      meta: { id: 'meta-id' },
      name: 'Unique NFT',
      image: 'ipfs://image',
      media: 'ipfs://media',
    }

    currentEvent.value = {
      collectionId: '2',
      sn: '9',
      metadata: undefined,
    }
    getMock.mockResolvedValue(nft)

    const store = { save: vi.fn().mockResolvedValue(undefined) }

    await handleUniquesMetadataSet({ store } as any)

    expect(nft.metadata).toBeUndefined()
    expect(nft.meta).toBeUndefined()
    expect(nft.name).toBeUndefined()
    expect(nft.image).toBeUndefined()
    expect(nft.media).toBeUndefined()
    expect(store.save).toHaveBeenCalledWith(nft)
    expect(unlinkNftTokenHandlerMock).toHaveBeenCalledWith({ store }, nft)
    expect(markCollectionRarityDirtyMock).toHaveBeenCalledWith('2')
    expect(markNftAttributesDirtyMock).toHaveBeenCalledWith('2-9')
    expect(setMetadataHandlerMock).not.toHaveBeenCalled()
  })

  it('still marks dirty state when unlink fails during metadata clear', async () => {
    const nft = {
      id: '3-7',
      metadata: 'ipfs://meta',
      meta: { id: 'meta-id' },
      name: 'Broken Unlink NFT',
      image: 'ipfs://image',
      media: 'ipfs://media',
    }

    currentEvent.value = {
      collectionId: '3',
      sn: '7',
      metadata: undefined,
    }
    getMock.mockResolvedValue(nft)
    unlinkNftTokenHandlerMock.mockRejectedValueOnce(new Error('boom'))

    const store = { save: vi.fn().mockResolvedValue(undefined) }

    await handleUniquesMetadataSet({ store } as any)

    expect(store.save).toHaveBeenCalledWith(nft)
    expect(markCollectionRarityDirtyMock).toHaveBeenCalledWith('3')
    expect(markNftAttributesDirtyMock).toHaveBeenCalledWith('3-7')
    expect(warnMock).toHaveBeenCalledWith('METADATA', 'Failed to unlink token for 3-7: Error: boom')
  })
})
