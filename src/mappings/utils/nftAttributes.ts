import { emOf } from '@kodadot1/metasquid/entity'
import { logger } from '@kodadot1/metasquid/logger'
import md5 from 'md5'
import { NFT_ATTRIBUTE_BACKFILL_ENABLED, NFT_ATTRIBUTE_BACKFILL_PER_BATCH } from '../../environment'
import { Store } from './types'

type AttributeLike = {
  trait?: string | null
  value?: string | null
}

type NftAttributeRow = {
  id: string
  itemAttributes?: AttributeLike[] | null
  metadataAttributes?: AttributeLike[] | null
}

type NftIdRow = {
  id: string
}

type NormalizedAttributeRow = {
  id: string
  nftId: string
  key: string
  value: string
}

const dirtyNftIds = new Set<string>()

export function normalizeAttributePart(input: unknown): string | null {
  if (input === null || input === undefined) {
    return null
  }

  const normalized = String(input)
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()

  return normalized.length > 0 ? normalized : null
}

export function normalizeAttributePair(attribute: AttributeLike): { key: string; value: string } | null {
  const key = normalizeAttributePart(attribute.trait)
  const value = normalizeAttributePart(attribute.value)

  if (!key || !value) {
    return null
  }

  return { key, value }
}

export function effectiveAttributes(
  itemAttributes?: AttributeLike[] | null,
  metadataAttributes?: AttributeLike[] | null,
): AttributeLike[] {
  if (Array.isArray(itemAttributes) && itemAttributes.length > 0) {
    return itemAttributes
  }

  return Array.isArray(metadataAttributes) ? metadataAttributes : []
}

export function buildNormalizedAttributes(nftId: string, attributes?: AttributeLike[] | null): NormalizedAttributeRow[] {
  const deduped = new Map<string, NormalizedAttributeRow>()

  for (const attribute of attributes || []) {
    const normalized = normalizeAttributePair(attribute)
    if (!normalized) {
      continue
    }

    const dedupeKey = JSON.stringify([normalized.key, normalized.value])
    if (deduped.has(dedupeKey)) {
      continue
    }

    const id = `${nftId}:${md5(normalized.key)}:${md5(normalized.value)}`
    deduped.set(
      dedupeKey,
      {
        id,
        nftId,
        key: normalized.key,
        value: normalized.value,
      },
    )
  }

  return Array.from(deduped.values())
}

export function markNftAttributesDirty(nftId: string | null | undefined): void {
  if (!nftId) {
    return
  }

  dirtyNftIds.add(String(nftId))
}

export async function syncNftAttributes(store: Store, nftId: string): Promise<void> {
  const rows = await emOf(store).query(
    `
      SELECT ne.id,
             ne.attributes AS "itemAttributes",
             me.attributes AS "metadataAttributes"
      FROM nft_entity AS ne
      LEFT JOIN metadata_entity AS me
        ON me.id = ne.meta_id
      WHERE ne.id = $1
      LIMIT 1
    `,
    [nftId],
  ) as NftAttributeRow[]

  const nft = rows[0]
  if (!nft) {
    return
  }

  const attributes = effectiveAttributes(nft.itemAttributes, nft.metadataAttributes)
  const normalized = buildNormalizedAttributes(nftId, attributes)

  await emOf(store).query(`DELETE FROM nft_attribute_entity WHERE nft_id = $1`, [nftId])

  if (normalized.length > 0) {
    const values = normalized
      .map((_, index) => {
        const base = index * 4
        return `($${base + 1}::text, $${base + 2}::text, $${base + 3}::text, $${base + 4}::text)`
      })
      .join(', ')

    const params = normalized.flatMap(attribute => [
      attribute.id,
      attribute.key,
      attribute.value,
      attribute.nftId,
    ])

    await emOf(store).query(
      `
        INSERT INTO nft_attribute_entity (id, key, value, nft_id)
        VALUES ${values}
      `,
      params,
    )
  }
}

export async function flushDirtyNftAttributes(store: Store): Promise<void> {
  if (!dirtyNftIds.size) {
    return
  }

  const nftIds = Array.from(dirtyNftIds)
  logger.info(`[NFT ATTRIBUTES] Flushing ${nftIds.length} dirty NFTs`)

  for (const nftId of nftIds) {
    try {
      await syncNftAttributes(store, nftId)
      dirtyNftIds.delete(nftId)
    } catch (error) {
      logger.error(
        `[NFT ATTRIBUTES] Failed to update NFT ${nftId}: ${(error as Error).message}`,
      )
      throw error
    }
  }
}

async function fetchNftsMissingAttributes(store: Store): Promise<string[]> {
  const rows = await emOf(store).query(
    `
      WITH effective AS (
        SELECT ne.id,
               CASE
                 WHEN jsonb_typeof(ne.attributes) = 'array' AND ne.attributes <> '[]'::jsonb THEN ne.attributes
                 WHEN jsonb_typeof(me.attributes) = 'array' THEN me.attributes
                 ELSE '[]'::jsonb
               END AS attributes
        FROM nft_entity AS ne
        LEFT JOIN metadata_entity AS me
          ON me.id = ne.meta_id
      )
      SELECT effective.id
      FROM effective
      WHERE EXISTS (
        SELECT 1
        FROM jsonb_array_elements(effective.attributes) AS attribute
        WHERE NULLIF(LOWER(REGEXP_REPLACE(TRIM(COALESCE(attribute ->> 'trait', '')), '\s+', ' ', 'g')), '') IS NOT NULL
          AND NULLIF(LOWER(REGEXP_REPLACE(TRIM(COALESCE(attribute ->> 'value', '')), '\s+', ' ', 'g')), '') IS NOT NULL
      )
        AND NOT EXISTS (
          SELECT 1
          FROM nft_attribute_entity AS nae
          WHERE nae.nft_id = effective.id
        )
      ORDER BY effective.id
      LIMIT $1
    `,
    [NFT_ATTRIBUTE_BACKFILL_PER_BATCH],
  ) as NftIdRow[]

  return rows.map(({ id }) => String(id))
}

export async function flushMissingNftAttributes(store: Store): Promise<void> {
  if (!NFT_ATTRIBUTE_BACKFILL_ENABLED || NFT_ATTRIBUTE_BACKFILL_PER_BATCH <= 0) {
    return
  }

  const nftIds = await fetchNftsMissingAttributes(store)
  if (!nftIds.length) {
    return
  }

  logger.info(`[NFT ATTRIBUTES] Backfilling ${nftIds.length} NFTs`)
  for (const nftId of nftIds) {
    try {
      await syncNftAttributes(store, nftId)
    } catch (error) {
      logger.error(
        `[NFT ATTRIBUTES] Failed to backfill NFT ${nftId}: ${(error as Error).message}`,
      )
      throw error
    }
  }
}
