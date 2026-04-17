import { getOrFail as get } from '@kodadot1/metasquid/entity'
import { CollectionEntity, NFTEntity } from '../../model'
import { unwrap } from '../utils/extract'
import { Context, isNFT } from '../utils/types'
import { addressOf, isAddress, sanitizeText, unHex } from '../utils/helper'
import { getAttributeEvent } from './getters'
import { attributeFrom, tokenIdOf } from './types'
import { markCollectionRarityDirty } from '../utils/rarity'
import { markNftAttributesDirty } from '../utils/nftAttributes'

/**
 * Handle the attribute set event (Nfts.AttributeSet, Nfts.AttributeCleared)
 * Sets the attribute of the collection or NFT
 * Logs NONE event
 * @param context - the context for the event
 **/
export async function handleAttributeSet(context: Context): Promise<void> {
  const event = unwrap(context, getAttributeEvent)
  const trait = sanitizeText(event.trait)
  const value = event.value === null ? null : sanitizeText(unHex(event.value) ?? String(event.value))

  const final =
    isNFT(event)
      ? await get(context.store, NFTEntity, tokenIdOf(event as any))
      : await get(context.store, CollectionEntity, event.collectionId)
  if (!final.attributes) {
    final.attributes = []
  }

  if ('royalty' in final && trait === 'royalty') {
    final.royalty = final.royalty || Number.parseFloat(value || '0')
  }

  if ('baseUri' in final && trait === 'baseUri') {
    final.baseUri = final.baseUri || value
  }

  if ('recipient' in final && trait === 'recipient') {
    try {
      final.recipient = final.recipient || addressOf(event.value as string)
    } catch (error) {
      const human = value
      final.recipient = isAddress(human) ? human : ''
      if (final.recipient === '') {
        console.log(error)
      }
    }
  }

  if (value === null) {
    final.attributes = final.attributes?.filter((attr) => attr.trait !== trait)
  } else {
    const attribute = final.attributes?.find((attr) => attr.trait === trait)
    if (attribute) {
      attribute.value = value
    } else if (trait !== 'royalty' && trait !== 'recipient') {
      const newAttribute = attributeFrom({ trait_type: trait, value })
      final.attributes?.push(newAttribute)
    }
  }

  await context.store.save(final)
  if (isNFT(event)) {
    markCollectionRarityDirty(event.collectionId)
    markNftAttributesDirty(tokenIdOf(event as any))
  }
}
