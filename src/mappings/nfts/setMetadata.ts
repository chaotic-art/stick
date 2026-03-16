import { get, getOptional } from '@kodadot1/metasquid/entity'
import { isFetchable } from '@kodadot1/minipfs'
import { unwrap } from '../utils/extract'
import { Context, isNFT } from '../utils/types'
import { CollectionEntity, Kind, NFTEntity } from '../../model'
import { handleMetadata } from '../shared/metadata'
import { debug, success, warn } from '../utils/logger'
import { updateItemMetadataByCollection } from '../utils/cache'
import { setMetadataHandler, unlinkNftTokenHandler } from '../shared/token'
import { tokenIdOf } from './types'
import { getMetadataEvent } from './getters'
import { markCollectionRarityDirty } from '../utils/rarity'
import { markNftAttributesDirty } from '../utils/nftAttributes'

const OPERATION = 'METADATA' as any

/**
 * Handle the metadata set event (Nfts.CollectionMetadataSet, Nfts.ItemMetadataSet, Nfts.ItemMetadataCleared, Nfts.CollectionMetadataCleared)
 * Sets the metadata of the collection or nft
 * @param context - the context for the event
 **/
export async function handleMetadataSet(context: Context): Promise<void> {
  const event = unwrap(context, getMetadataEvent)
  debug(OPERATION, event)

  if (!event.metadata && !isNFT(event)) {
    return
  }

  const eventIsOnNFT = isNFT(event)

  const final = eventIsOnNFT
    ? await get(context.store, NFTEntity, tokenIdOf(event as any))
    : await get(context.store, CollectionEntity, event.collectionId)

  if (!final) {
    warn(OPERATION, `MISSING ${event.collectionId}-${event.sn}`)
    return
  }

  if (!event.metadata && eventIsOnNFT) {
    // Clear derived NFT fields and unlink stale token grouping when metadata is removed.
    final.metadata = undefined
    final.meta = undefined
    final.name = undefined
    final.image = undefined
    final.media = undefined

    await context.store.save(final)
    try {
      await unlinkNftTokenHandler(context, final as NFTEntity)
    } catch (error) {
      warn(OPERATION, `Failed to unlink token for ${final.id}: ${error}`)
    }
    markCollectionRarityDirty(event.collectionId)
    markNftAttributesDirty(final.id)
    return
  }

  if (!isFetchable(event.metadata!)) {
    warn(OPERATION, `NOT FETCHABLE ${event.collectionId}-${event.sn} ${event.metadata}`)
    return
  }

  final.metadata = event.metadata

  if (final.metadata) {
    const metadata = await handleMetadata(final.metadata, context.store)
    const previousNftMedia = final?.image || final?.media
    const newNftMedia = metadata?.image || metadata?.animationUrl
    final.meta = metadata
    final.name = metadata?.name
    final.image = metadata?.image
    final.media = metadata?.animationUrl

    if (final instanceof CollectionEntity) {
      final.kind = metadata?.kind || Kind.mixed
      success(OPERATION, `[COLLECTION METADATA SET] ${final.id} - ${metadata?.kind || Kind.mixed}`)
    }

    await context.store.save(final)

    if (eventIsOnNFT) {
      markCollectionRarityDirty(event.collectionId)
      markNftAttributesDirty(final.id)

      const collection = await getOptional<CollectionEntity>(context.store, CollectionEntity, event.collectionId)

      if (!collection) {
        warn(OPERATION, `collection ${event.collectionId} not found`)
        return
      }
      if (final instanceof NFTEntity && newNftMedia !== previousNftMedia) {
        await setMetadataHandler(context, collection, final)
      }
    }

    if (!event.sn && final.metadata) {
      await updateItemMetadataByCollection(context.store, event.collectionId)
    }
  }
}
