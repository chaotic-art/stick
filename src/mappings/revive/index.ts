import { Context } from '../utils/types'
import { COLLECTION_REGISTERED_TOPIC } from './abi/registry'
import { ERC721_TRANSFER_TOPIC } from './abi/erc721'
import { handleTokenBurn } from './burn'
import { handleCollectionCreate } from './createCollection'
import { decodeTransferEvent, isBurnTransfer, isMintTransfer, topic0Of } from './helpers'
import { handleTokenMint } from './mint'
import { handleTokenTransfer } from './transfer'

export async function handleReviveEvent(context: Context): Promise<void> {
  switch (topic0Of(context.event.args)) {
    case COLLECTION_REGISTERED_TOPIC.toLowerCase():
      await handleCollectionCreate(context)
      return
    case ERC721_TRANSFER_TOPIC.toLowerCase(): {
      const transfer = decodeTransferEvent(context.event.args)
      if (isMintTransfer(transfer.from)) {
        await handleTokenMint(context, transfer)
        return
      }

      if (isBurnTransfer(transfer.to)) {
        await handleTokenBurn(context, transfer)
        return
      }

      await handleTokenTransfer(context, transfer)
      return
    }
    default:
      return
  }
}
