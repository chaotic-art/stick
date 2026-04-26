import { getOrCreate } from '@kodadot1/metasquid/entity'
import md5 from 'md5'
import {
  CollectionEntity as CE,
  CollectionKind,
  Interaction,
  Kind,
} from '../../model'
import { handleMetadata } from '../shared/metadata'
import { pending, success } from '../utils/logger'
import { Context } from '../utils/types'
import { readCollectionOwner, readContractUri, readRegistryCollection } from './client'
import { collectionIdFromAddress, decodeCollectionRegisteredEvent } from './helpers'

const OPERATION = Interaction.CREATE

export async function handleCollectionCreate(context: Context): Promise<void> {
  pending(OPERATION, `${context.block.height}`)

  const event = decodeCollectionRegisteredEvent(context.event.args)
  const blockNumber = BigInt(context.block.height)
  const collectionState = await readRegistryCollection(event.index, blockNumber)
  const currentOwner = (await readCollectionOwner(event.collectionAddress, blockNumber)) || event.deployer
  const contractUri = await readContractUri(event.collectionAddress, blockNumber)
  const id = collectionIdFromAddress(event.collectionAddress)

  const final = await getOrCreate(context.store, CE, id, {})

  final.id = id
  final.hash = md5(id)
  final.blockNumber = blockNumber
  final.burned = false
  final.createdAt = new Date(context.block.timestamp || Date.now())
  final.currentOwner = currentOwner
  final.distribution = 0
  final.floor = 0n
  final.highestSale = 0n
  final.issuer = collectionState.deployer || event.deployer
  final.max = undefined
  final.metadata = contractUri || null
  final.name = collectionState.name || null
  final.nftCount = 0
  final.ownerCount = 0
  final.supply = 0
  final.updatedAt = new Date(context.block.timestamp || Date.now())
  final.version = 3
  final.volume = 0n
  final.collectionType = CollectionKind.ERC721
  final.type = null
  final.settings = null

  if (final.metadata) {
    const metadata = await handleMetadata(final.metadata, context.store)
    final.meta = metadata
    final.name = metadata?.name || final.name
    final.image = metadata?.image
    final.media = metadata?.animationUrl
    final.kind = metadata?.kind || Kind.mixed
  }

  await context.store.save(final)
  success(OPERATION, final.id)
}
