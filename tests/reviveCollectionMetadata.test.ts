import 'reflect-metadata'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  getOptionalMock,
  handleMetadataMock,
  readContractUriMock,
  warnMock,
  pendingMock,
  successMock,
} = vi.hoisted(() => ({
  getOptionalMock: vi.fn(),
  handleMetadataMock: vi.fn(),
  readContractUriMock: vi.fn(),
  warnMock: vi.fn(),
  pendingMock: vi.fn(),
  successMock: vi.fn(),
}))

vi.mock('@kodadot1/metasquid/entity', () => ({
  getOptional: getOptionalMock,
}))

vi.mock('../src/mappings/shared/metadata', () => ({
  handleMetadata: handleMetadataMock,
}))

vi.mock('../src/mappings/revive/client', () => ({
  readContractUri: readContractUriMock,
}))

vi.mock('../src/mappings/utils/logger', () => ({
  warn: warnMock,
  pending: pendingMock,
  success: successMock,
}))

vi.mock('../src/model', () => ({
  Kind: {
    mixed: 'mixed',
    collectible: 'collectible',
  },
  CollectionEntity: class CollectionEntity {},
}))

import { handleCollectionMetadataUpdate } from '../src/mappings/revive/updateCollectionMetadata'

const baseContext = {
  block: {
    height: 5650400,
    timestamp: new Date('2026-03-31T11:00:00.000Z').getTime(),
  },
  store: {
    save: vi.fn().mockResolvedValue(undefined),
  },
} as any

function buildArgs(newUri: string, prevUri = '') {
  return {
    contract: '0x1568927db173e22ca65643e1e7cac114d9b39f4e',
    topics: ['0xdeadbeef'],
    data: '0x',
    __decoded: { prevUri, newUri },
  }
}

vi.mock('../src/mappings/revive/helpers', async () => {
  const actual = await vi.importActual<any>('../src/mappings/revive/helpers')
  return {
    ...actual,
    decodeContractUriUpdatedEvent: (args: any) => ({
      contractAddress: actual.normalizeEvmAddress(args.contract),
      prevUri: args.__decoded?.prevUri || '',
      newUri: args.__decoded?.newUri || '',
    }),
  }
})

describe('revive collection metadata refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates known collections from event newUri', async () => {
    const collection = {
      id: '0x1568927db173e22ca65643e1e7cac114d9b39f4e',
      name: 'Edge',
      metadata: null,
      image: null,
      media: null,
      kind: null,
      updatedAt: null,
    }
    const metadataEntity = {
      id: 'ipfs://new/metadata.json',
      name: 'Edge Metadata',
      image: 'ipfs://image',
      animationUrl: 'ipfs://animation',
      kind: 'collectible',
    }

    getOptionalMock.mockResolvedValue(collection)
    handleMetadataMock.mockResolvedValue(metadataEntity)

    await handleCollectionMetadataUpdate({
      ...baseContext,
      event: { args: buildArgs('ipfs://new/metadata.json') },
    })

    expect(collection.metadata).toBe('ipfs://new/metadata.json')
    expect(collection.name).toBe('Edge Metadata')
    expect(collection.image).toBe('ipfs://image')
    expect(collection.media).toBe('ipfs://animation')
    expect(collection.kind).toBe('collectible')
    expect(baseContext.store.save).toHaveBeenCalledWith(collection)
    expect(successMock).toHaveBeenCalledWith(
      'CONTRACT_METADATA',
      '0x1568927db173e22ca65643e1e7cac114d9b39f4e ipfs://new/metadata.json',
    )
  })

  it('skips unknown collections', async () => {
    getOptionalMock.mockResolvedValue(undefined)

    await handleCollectionMetadataUpdate({
      ...baseContext,
      event: { args: buildArgs('ipfs://new/metadata.json') },
    })

    expect(handleMetadataMock).not.toHaveBeenCalled()
    expect(baseContext.store.save).not.toHaveBeenCalled()
    expect(warnMock).toHaveBeenCalledWith(
      'CONTRACT_METADATA',
      'Unknown collection 0x1568927db173e22ca65643e1e7cac114d9b39f4e',
    )
  })

  it('falls back to contractURI() when event newUri is empty', async () => {
    const collection = {
      id: '0x1568927db173e22ca65643e1e7cac114d9b39f4e',
      name: 'Edge',
      metadata: null,
      image: null,
      media: null,
      kind: null,
      updatedAt: null,
    }

    getOptionalMock.mockResolvedValue(collection)
    readContractUriMock.mockResolvedValue('ipfs://fallback/metadata.json')
    handleMetadataMock.mockResolvedValue(undefined)

    await handleCollectionMetadataUpdate({
      ...baseContext,
      event: { args: buildArgs('') },
    })

    expect(readContractUriMock).toHaveBeenCalledWith(
      '0x1568927db173e22ca65643e1e7cac114d9b39f4e',
      5650400n,
    )
    expect(collection.metadata).toBe('ipfs://fallback/metadata.json')
    expect(baseContext.store.save).toHaveBeenCalledWith(collection)
  })

  it('warns and skips when uri stays empty', async () => {
    const collection = {
      id: '0x1568927db173e22ca65643e1e7cac114d9b39f4e',
      name: 'Edge',
      metadata: null,
      image: null,
      media: null,
      kind: null,
      updatedAt: null,
    }

    getOptionalMock.mockResolvedValue(collection)
    readContractUriMock.mockResolvedValue('')

    await handleCollectionMetadataUpdate({
      ...baseContext,
      event: { args: buildArgs('') },
    })

    expect(handleMetadataMock).not.toHaveBeenCalled()
    expect(baseContext.store.save).not.toHaveBeenCalled()
    expect(warnMock).toHaveBeenCalledWith(
      'CONTRACT_METADATA',
      'Empty contractURI 0x1568927db173e22ca65643e1e7cac114d9b39f4e',
    )
  })

  it('stores raw metadata uri even when metadata fetch is empty', async () => {
    const collection = {
      id: '0x1568927db173e22ca65643e1e7cac114d9b39f4e',
      name: 'Edge',
      metadata: null,
      image: 'existing-image',
      media: 'existing-media',
      kind: 'mixed',
      updatedAt: null,
    }

    getOptionalMock.mockResolvedValue(collection)
    handleMetadataMock.mockResolvedValue(undefined)

    await handleCollectionMetadataUpdate({
      ...baseContext,
      event: { args: buildArgs('ipfs://new/metadata.json') },
    })

    expect(collection.metadata).toBe('ipfs://new/metadata.json')
    expect(collection.name).toBe('Edge')
    expect(collection.image).toBeUndefined()
    expect(collection.media).toBeUndefined()
    expect(collection.kind).toBe('mixed')
    expect(baseContext.store.save).toHaveBeenCalledWith(collection)
  })
})
