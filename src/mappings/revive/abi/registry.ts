import { parseAbi, toEventSelector } from 'viem'

export const registryAbi = parseAbi([
  'event CollectionRegistered(uint256 indexed index, address collectionAddress, address deployer)',
  'function getCollection(uint256 index) view returns ((address collectionAddress, address deployer, string name, uint256 createdAt))',
])

export const COLLECTION_REGISTERED_TOPIC = toEventSelector(
  'CollectionRegistered(uint256,address,address)',
)
