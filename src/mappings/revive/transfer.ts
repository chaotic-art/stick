import { getWith } from '@kodadot1/metasquid/entity'
import { Interaction, NFTEntity as NE } from '../../model'
import { createEvent } from '../shared/event'
import { calculateCollectionOwnerCountAndDistribution } from '../utils/helper'
import { pending, success } from '../utils/logger'
import { Context } from '../utils/types'
import { DecodedTransferEvent, nftIdFromParts, toReviveBaseCall } from './helpers'

const OPERATION = Interaction.SEND

export async function handleTokenTransfer(
  context: Context,
  transfer: DecodedTransferEvent,
): Promise<void> {
  pending(OPERATION, `${context.block.height}`)

  const id = nftIdFromParts(transfer.contractAddress, transfer.tokenId)
  const entity = await getWith(context.store, NE, id, { collection: true })

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
    entity.currentOwner,
  )

  success(OPERATION, id)
}
