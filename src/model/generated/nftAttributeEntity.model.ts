import {Entity as Entity_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_} from "@subsquid/typeorm-store"
import {AttributeEntity} from "./attributeEntity.model"
import {NFTEntity} from "./nftEntity.model"

@Entity_()
export class NftAttributeEntity {
    constructor(props?: Partial<NftAttributeEntity>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_()
    @ManyToOne_(() => NFTEntity, {nullable: true})
    nft!: NFTEntity

    @Index_()
    @ManyToOne_(() => AttributeEntity, {nullable: true})
    attribute!: AttributeEntity
}
