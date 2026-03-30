import { parseAbi, toEventSelector } from 'viem'

export const erc721Abi = parseAbi([
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
  'function owner() view returns (address)',
  'function contractURI() view returns (string)',
  'function tokenURI(uint256 tokenId) view returns (string)',
])

export const ERC721_TRANSFER_TOPIC = toEventSelector('Transfer(address,address,uint256)')
