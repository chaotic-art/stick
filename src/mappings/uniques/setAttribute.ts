import { getOrFail as get } from '@kodadot1/metasquid/entity'
import { CollectionEntity, NFTEntity } from '../../model'
import { unwrap } from '../utils/extract'
import { unHex } from '../utils/helper'
import { Context } from '../utils/types'
import { getAttributeEvent } from './getters'
import { attributeFrom, tokenIdOf } from './types'
import { markCollectionRarityDirty } from '../utils/rarity'
import { markNftAttributesDirty } from '../utils/nftAttributes'

/**
 * Handle the attribute set event (Uniques.AttributeSet, Uniques.AttributeCleared)
 * Sets the attribute of the collection or NFT
 * Logs NONE event
 * @param context - the context for the event
 **/
export async function handleAttributeSet(context: Context): Promise<void> {
  const event = unwrap(context, getAttributeEvent)
  const value = event.value == null ? null : unHex(event.value)

  const final =
    event.sn !== undefined
      ? await get(context.store, NFTEntity, tokenIdOf(event as any))
      : await get(context.store, CollectionEntity, event.collectionId)

  if (!final.attributes) {
    final.attributes = []
  }

  if (value === null) {
    final.attributes = final.attributes?.filter((attr) => attr.trait !== event.trait)
  } else {
    const attribute = final.attributes?.find((attr) => attr.trait === event.trait)
    if (attribute) {
      attribute.value = value
    } else {
      const newAttribute = attributeFrom({ trait_type: event.trait, value })
      final.attributes?.push(newAttribute)
    }
  }

  await context.store.save(final)
  // Collection-level attributes do not affect NFT rarity; only item attributes should trigger recompute.
  if (event.sn !== undefined) {
    markCollectionRarityDirty(event.collectionId)
    markNftAttributesDirty(tokenIdOf(event as any))
  }
}
