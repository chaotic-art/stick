import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, StringColumn as StringColumn_} from "@subsquid/typeorm-store"
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
    @StringColumn_({nullable: false})
    key!: string

    @Index_()
    @StringColumn_({nullable: false})
    value!: string
}
