import { getOptional } from '@kodadot1/metasquid/entity'
import { CollectionEntity as CE, Kind } from '../../model'
import { handleMetadata } from '../shared/metadata'
import { pending, success, warn } from '../utils/logger'
import { Context } from '../utils/types'
import { readContractUri } from './client'
import { collectionIdFromAddress, decodeContractUriUpdatedEvent } from './helpers'

const OPERATION = 'CONTRACT_METADATA' as any

export async function handleCollectionMetadataUpdate(context: Context): Promise<void> {
  pending(OPERATION, `${context.block.height}`)

  const event = decodeContractUriUpdatedEvent(context.event.args)
  const collectionId = collectionIdFromAddress(event.contractAddress)
  const collection = await getOptional<CE>(context.store, CE, collectionId)

  if (!collection) {
    warn(OPERATION, `Unknown collection ${collectionId}`)
    return
  }

  const fallbackUri = event.newUri.trim()
    ? event.newUri.trim()
    : await readContractUri(event.contractAddress, BigInt(context.block.height))
  const resolvedUri = fallbackUri.trim()

  if (!resolvedUri) {
    warn(OPERATION, `Empty contractURI ${collectionId}`)
    return
  }

  collection.metadata = resolvedUri
  collection.updatedAt = new Date(context.block.timestamp || Date.now())

  const metadata = await handleMetadata(collection.metadata, context.store)
  collection.meta = metadata
  collection.name = metadata?.name || collection.name
  collection.image = metadata?.image
  collection.media = metadata?.animationUrl
  collection.kind = metadata?.kind || collection.kind || Kind.mixed

  await context.store.save(collection)
  success(OPERATION, `${collection.id} ${collection.metadata}`)
}
