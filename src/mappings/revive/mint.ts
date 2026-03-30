import { create, getOptional } from '@kodadot1/metasquid/entity'
import md5 from 'md5'
import { CollectionEntity as CE, Interaction, NFTEntity as NE } from '../../model'
import { createEvent } from '../shared/event'
import { handleMetadata } from '../shared/metadata'
import { calculateCollectionOwnerCountAndDistribution } from '../utils/helper'
import { pending, success, warn } from '../utils/logger'
import { Context } from '../utils/types'
import { readTokenUri } from './client'
import { DecodedTransferEvent, collectionIdFromAddress, nftIdFromParts, toReviveBaseCall } from './helpers'

const OPERATION = Interaction.MINT

export async function handleTokenMint(
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
  const existing = await getOptional<NE>(context.store, NE, id)
  if (existing) {
    warn(OPERATION, `NFT ${id} already exists`)
    return
  }

  const final = create(NE, id, {})
  final.id = id
  final.hash = md5(id)
  final.issuer = collection.issuer
  final.currentOwner = transfer.to
  final.blockNumber = BigInt(context.block.height)
  final.collection = collection
  final.sn = transfer.tokenId
  final.metadata = await readTokenUri(transfer.contractAddress, transfer.tokenId, BigInt(context.block.height))
  final.price = null
  final.burned = false
  final.createdAt = new Date(context.block.timestamp || Date.now())
  final.updatedAt = new Date(context.block.timestamp || Date.now())
  final.lewd = false
  final.version = 3
  final.recipient = collection.recipient
  final.royalty = collection.royalty

  collection.updatedAt = final.updatedAt
  collection.nftCount += 1
  collection.supply += 1

  const { ownerCount, distribution } = await calculateCollectionOwnerCountAndDistribution(
    context.store,
    collection.id,
    final.currentOwner,
  )
  collection.ownerCount = ownerCount
  collection.distribution = distribution

  if (final.metadata) {
    const metadata = await handleMetadata(final.metadata, context.store)
    final.meta = metadata
    final.name = metadata?.name
    final.image = metadata?.image
    final.media = metadata?.animationUrl
  }

  await context.store.save(final)
  await context.store.save(collection)

  await createEvent(
    final,
    Interaction.MINT,
    toReviveBaseCall(collection.currentOwner || collection.issuer, context),
    final.metadata || '',
    context.store,
    final.currentOwner,
  )

  success(OPERATION, id)
}
