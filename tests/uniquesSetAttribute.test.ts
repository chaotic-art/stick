import 'reflect-metadata'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  currentEvent,
  getMock,
  markCollectionRarityDirtyMock,
  markNftAttributesDirtyMock,
} = vi.hoisted(() => ({
  currentEvent: { value: undefined as any },
  getMock: vi.fn(),
  markCollectionRarityDirtyMock: vi.fn(),
  markNftAttributesDirtyMock: vi.fn(),
}))

vi.mock('@kodadot1/metasquid/entity', () => ({
  getOrFail: getMock,
}))

vi.mock('../src/mappings/utils/extract', () => ({
  unwrap: () => currentEvent.value,
}))

vi.mock('../src/mappings/uniques/getters', () => ({
  getAttributeEvent: vi.fn(),
}))

vi.mock('../src/mappings/utils/rarity', () => ({
  markCollectionRarityDirty: markCollectionRarityDirtyMock,
}))

vi.mock('../src/mappings/utils/nftAttributes', () => ({
  markNftAttributesDirty: markNftAttributesDirtyMock,
}))

vi.mock('../src/model', () => {
  class Attribute {
    constructor(_props?: unknown, data?: Partial<Attribute>) {
      Object.assign(this, data)
    }
  }
  class NFTEntity {}
  class CollectionEntity {}
  return {
    Attribute,
    NFTEntity,
    CollectionEntity,
  }
})

import { handleAttributeSet } from '../src/mappings/uniques/setAttribute'

describe('uniques attribute handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('removes nft attributes when clear events omit value', async () => {
    const nft = {
      id: '442-517438',
      attributes: [
        { trait: 'rarity', value: 'legendary' },
        { trait: 'color', value: 'blue' },
      ],
    }

    currentEvent.value = {
      collectionId: '442',
      sn: '517438',
      trait: 'rarity',
      value: undefined,
    }
    getMock.mockResolvedValue(nft)

    const store = { save: vi.fn().mockResolvedValue(undefined) }

    await handleAttributeSet({ store } as any)

    expect(nft.attributes).toEqual([{ trait: 'color', value: 'blue' }])
    expect(store.save).toHaveBeenCalledWith(nft)
    expect(markCollectionRarityDirtyMock).toHaveBeenCalledWith('442')
    expect(markNftAttributesDirtyMock).toHaveBeenCalledWith('442-517438')
  })
})
