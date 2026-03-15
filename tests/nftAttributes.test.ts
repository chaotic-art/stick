import { describe, expect, it } from 'vitest'
import {
  buildNormalizedAttributes,
  effectiveAttributes,
  normalizeAttributePair,
  normalizeAttributePart,
} from '../src/mappings/utils/nftAttributes'

describe('NFT attribute normalization', () => {
  it('normalizes by trimming, collapsing whitespace, and lowercasing', () => {
    expect(normalizeAttributePart('  Blue   Sky  ')).toBe('blue sky')
  })

  it('drops empty normalized key/value pairs', () => {
    expect(normalizeAttributePair({ trait: '   ', value: 'Blue' })).toBeNull()
    expect(normalizeAttributePair({ trait: 'Background', value: '   ' })).toBeNull()
  })

  it('deduplicates equivalent normalized pairs per nft', () => {
    const rows = buildNormalizedAttributes('1-1', [
      { trait: 'Background', value: 'Blue' },
      { trait: ' background ', value: '  blue  ' },
      { trait: 'Hat', value: 'Cap' },
    ])

    expect(rows).toHaveLength(2)
    expect(rows.map(row => `${row.key}:${row.value}`)).toEqual(['background:blue', 'hat:cap'])
  })

  it('does not collapse distinct pairs that would collide with a :: join key', () => {
    const rows = buildNormalizedAttributes('1-4', [
      { trait: 'a', value: 'b::c' },
      { trait: 'a::b', value: 'c' },
    ])

    expect(rows).toHaveLength(2)
    expect(rows.map(row => `${row.key}:${row.value}`)).toEqual(['a:b::c', 'a::b:c'])
  })

  it('uses item attributes before metadata fallback', () => {
    const itemAttributes = [{ trait: 'Hat', value: 'Cap' }]
    const metadataAttributes = [{ trait: 'Background', value: 'Blue' }]

    expect(effectiveAttributes(itemAttributes, metadataAttributes)).toEqual(itemAttributes)
  })

  it('falls back to metadata attributes only when item attributes are empty', () => {
    const metadataAttributes = [{ trait: 'Background', value: 'Blue' }]

    expect(effectiveAttributes([], metadataAttributes)).toEqual(metadataAttributes)
  })

  it('produces no normalized rows when metadata fallback disappears', () => {
    expect(buildNormalizedAttributes('1-2', effectiveAttributes([], undefined))).toEqual([])
  })

  it('removes cleared traits when rebuilding normalized rows', () => {
    const rows = buildNormalizedAttributes('1-3', [
      { trait: 'Background', value: 'Blue' },
    ])

    expect(rows).toHaveLength(1)
    expect(rows[0].key).toBe('background')
    expect(rows[0].value).toBe('blue')
  })
})
