import {
  SubstrateBatchProcessor as SubstrateProcessor
} from '@subsquid/substrate-processor'
import { TypeormDatabase as Database } from '@subsquid/typeorm-store'
import logger from './mappings/utils/logger'
import { Asset, NewNonFungible, NonFungible, NonFungibleCall, ParachainSystemCall, Unique } from './processable'

import {
  CHAIN,
  getArchiveUrl,
  getNodeUrl,
  REVIVE_ENABLED,
  REVIVE_EVM_RPC_URL,
  REVIVE_REGISTRY_ADDRESS,
  REVIVE_START_BLOCK,
  STARTING_BLOCK,
  UNIQUES_ENABLED,
} from './environment'
import { mainFrame } from './mappings'
import { CONTRACT_URI_UPDATED_TOPIC, ERC721_TRANSFER_TOPIC } from './mappings/revive/abi/erc721'
import { COLLECTION_REGISTERED_TOPIC } from './mappings/revive/abi/registry'
import { SelectedFields, fieldSelection } from './mappings/utils/types'

const database = new Database({ supportHotBlocks: false })
const processor = new SubstrateProcessor<SelectedFields>()
const ONLY_ARCHIVE = false

// In case you need custom types
// processor.setTypesBundle(CHAIN)

// Set the starting block
processor.setBlockRange({ from: STARTING_BLOCK })

// Get this from the environment based on the chain from .env
const archive = getArchiveUrl()
const chain = getNodeUrl()


processor.setRpcEndpoint({
  url: chain,
  rateLimit: 10
})

processor.setGateway(archive);

// disables RPC ingestion and drastically reduce no of RPC calls
processor.setRpcDataIngestionSettings({ disabled: ONLY_ARCHIVE })

/**
 * Uniques nft pallet
 */
if (UNIQUES_ENABLED) {
  processor.addEvent({ name: [Unique.createCollection], call: true, extrinsic: true }) 
  processor.addEvent({ name: [Unique.clearAttribute], call: true, extrinsic: true }) 
  processor.addEvent({ name: [Unique.setAttribute], call: true, extrinsic: true }) 
  processor.addEvent({ name: [Unique.burn], call: true, extrinsic: true }) 
  processor.addEvent({ name: [Unique.forceCreateClass], call: true, extrinsic: true }) 
  processor.addEvent({ name: [Unique.clearClassMetadata], call: true, extrinsic: true }) 
  processor.addEvent({ name: [Unique.setClassMetadata], call: true, extrinsic: true }) 
  processor.addEvent({ name: [Unique.setCollectionMaxSupply], call: true, extrinsic: true }) 
  processor.addEvent({ name: [Unique.clearCollectionMetadata], call: true, extrinsic: true }) 
  processor.addEvent({ name: [Unique.setCollectionMetadata], call: true, extrinsic: true }) 
  processor.addEvent({ name: [Unique.destroyCollection], call: true, extrinsic: true }) 
  processor.addEvent({ name: [Unique.createItem], call: true, extrinsic: true }) 
  processor.addEvent({ name: [Unique.sold], call: true, extrinsic: true }) 
  processor.addEvent({ name: [Unique.clearPrice], call: true, extrinsic: true }) 
  processor.addEvent({ name: [Unique.setPrice], call: true, extrinsic: true }) 
  processor.addEvent({ name: [Unique.clearMetadata], call: true, extrinsic: true }) 
  processor.addEvent({ name: [Unique.setMetadata], call: true, extrinsic: true }) 
  processor.addEvent({ name: [Unique.changeIssuer], call: true, extrinsic: true }) 
  processor.addEvent({ name: [Unique.changeTeam], call: true, extrinsic: true }) 
  processor.addEvent({ name: [Unique.transfer], call: true, extrinsic: true }) 
}

/**
 * NonFungibles nft pallet
 */
processor.addEvent({ name: [NonFungible.createCollection], call: true, extrinsic: true }) 
processor.addEvent({ name: [NonFungible.clearAttribute], call: true, extrinsic: true }) 
processor.addEvent({ name: [NonFungible.setAttribute], call: true, extrinsic: true }) 
processor.addEvent({ name: [NonFungible.burn], call: true, extrinsic: true }) 
processor.addEvent({ name: [NonFungible.forceCreateCollection], call: true, extrinsic: true }) 
processor.addEvent({ name: [NonFungible.clearCollectionMetadata], call: true, extrinsic: true }) 
processor.addEvent({ name: [NonFungible.setCollectionMetadata], call: true, extrinsic: true }) 
processor.addEvent({ name: [NonFungible.setCollectionMaxSupply], call: true, extrinsic: true }) 
processor.addEvent({ name: [NonFungible.clearCollectionMetadata], call: true, extrinsic: true }) 
processor.addEvent({ name: [NonFungible.setCollectionMetadata], call: true, extrinsic: true }) 
processor.addEvent({ name: [NonFungible.destroyCollection], call: true, extrinsic: true }) 
processor.addEvent({ name: [NonFungible.createItem], call: true, extrinsic: true }) 
processor.addEvent({ name: [NonFungible.sold], call: true, extrinsic: true }) 
processor.addEvent({ name: [NonFungible.clearPrice], call: true, extrinsic: true }) 
processor.addEvent({ name: [NonFungible.setPrice], call: true, extrinsic: true }) 
processor.addEvent({ name: [NonFungible.clearMetadata], call: true, extrinsic: true }) 
processor.addEvent({ name: [NonFungible.setMetadata], call: true, extrinsic: true }) 
processor.addEvent({ name: [NonFungible.changeIssuer], call: true, extrinsic: true }) 
processor.addEvent({ name: [NonFungible.changeTeam], call: true, extrinsic: true }) 
processor.addEvent({ name: [NonFungible.transfer], call: true, extrinsic: true }) 
processor.addEvent({ name: [NewNonFungible.createSwap], call: true, extrinsic: true }) 
processor.addEvent({ name: [NewNonFungible.cancelSwap], call: true, extrinsic: true }) 
processor.addEvent({ name: [NewNonFungible.claimSwap], call: true, extrinsic: true }) 
// IMPORTANT: THIS IS CALL NOT EVENT!
processor.addCall({ name: [NonFungibleCall.updateMintSettings], extrinsic: true })

// Capture relay chain context from inherent call
processor.addCall({ name: [ParachainSystemCall.setValidationData] })

processor.setFields(fieldSelection)

/**
 * Assets pallet
 */
// processor.addEvent({ name: [Asset.create], call: true, extrinsic: true })
// processor.addEvent({ name: [Asset.forceCreate], call: true, extrinsic: true })
processor.addEvent({ name: [Asset.setMetadata], call: true, extrinsic: true })
// processor.addEvent({ name: [Asset.clearMetadata], call: true, extrinsic: true })

if (REVIVE_ENABLED) {
  if (!REVIVE_REGISTRY_ADDRESS) {
    throw new Error('REVIVE_REGISTRY_ADDRESS is required when REVIVE_ENABLED=true')
  }

  if (!REVIVE_EVM_RPC_URL) {
    throw new Error('REVIVE_EVM_RPC_URL is required when REVIVE_ENABLED=true')
  }

  processor.addReviveContractEmitted({
    contract: [REVIVE_REGISTRY_ADDRESS],
    topic0: [COLLECTION_REGISTERED_TOPIC],
    range: { from: REVIVE_START_BLOCK },
  })

  processor.addReviveContractEmitted({
    topic0: [ERC721_TRANSFER_TOPIC],
    range: { from: REVIVE_START_BLOCK },
  })

  processor.addReviveContractEmitted({
    topic0: [CONTRACT_URI_UPDATED_TOPIC],
    range: { from: REVIVE_START_BLOCK },
  })
}

logger.info(`PROCESSING ~~ ${CHAIN.toUpperCase()} ~~ EVENTS`)

// const handler = async <T extends FieldSelection = SelectedFields>(ctx: DataHandlerContext<Store, T>) => {}

// mainFrame function is called when the processor is ready to process the data
processor.run(database, mainFrame)
