import {Entity as Entity_, PrimaryColumn as PrimaryColumn_, StringColumn as StringColumn_, Index as Index_, OneToMany as OneToMany_} from "@subsquid/typeorm-store"
import {NftAttributeEntity} from "./nftAttributeEntity.model"

@Entity_()
export class AttributeEntity {
    constructor(props?: Partial<AttributeEntity>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_()
    @StringColumn_({nullable: false})
    key!: string

    @Index_()
    @StringColumn_({nullable: false})
    value!: string

    @OneToMany_(() => NftAttributeEntity, e => e.attribute)
    nftAttributes!: NftAttributeEntity[]
}
