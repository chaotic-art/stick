import { getOptional, getWith } from '@kodadot1/metasquid/entity'
import { CollectionEntity as CE, Interaction, NFTEntity as NE } from '../../model'
import { createEvent } from '../shared/event'
import { calculateCollectionOwnerCountAndDistribution } from '../utils/helper'
import { pending, success, warn } from '../utils/logger'
import { Context } from '../utils/types'
import { DecodedTransferEvent, collectionIdFromAddress, nftIdFromParts, toReviveBaseCall } from './helpers'

const OPERATION = Interaction.SEND

export async function handleTokenTransfer(
  context: Context,
  transfer: DecodedTransferEvent,
): Promise<void> {
  pending(OPERATION, `${context.block.height}`)

  const collectionId = collectionIdFromAddress(transfer.contractAddress)
  const collection = await getOptional<CE>(context.store, CE, collectionId)

  if (!collection) {
    warn(OPERATION, `Unknown collection ${collectionId}`)
    return
  }

  const id = nftIdFromParts(transfer.contractAddress, transfer.tokenId)

  let entity: NE
  try {
    entity = await getWith(context.store, NE, id, { collection: true })
  } catch {
    warn(OPERATION, `Unknown NFT ${id}`)
    return
  }

  const oldOwner = entity.currentOwner
  entity.currentOwner = transfer.to
  entity.updatedAt = new Date(context.block.timestamp || Date.now())

  const { ownerCount, distribution } = await calculateCollectionOwnerCountAndDistribution(
    context.store,
    entity.collection.id,
    entity.currentOwner,
    oldOwner,
  )
  entity.collection.ownerCount = ownerCount
  entity.collection.distribution = distribution
  entity.collection.updatedAt = entity.updatedAt

  await context.store.save(entity)
  await context.store.save(entity.collection)

  await createEvent(
    entity,
    Interaction.SEND,
    toReviveBaseCall(transfer.from, context),
    entity.metadata || '',
    context.store,
    oldOwner,
  )

  success(OPERATION, id)
}
