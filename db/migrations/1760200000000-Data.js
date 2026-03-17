module.exports = class Data1760200000000 {
    name = 'Data1760200000000'

    async up(db) {
        await db.query(`CREATE TABLE "attribute_entity" ("id" character varying NOT NULL, "key" text NOT NULL, "value" text NOT NULL, CONSTRAINT "PK_7c72ca2b5d1f0df0f3bcf1914e8" PRIMARY KEY ("id"))`)
        await db.query(`CREATE INDEX "IDX_attribute_entity_key" ON "attribute_entity" ("key") `)
        await db.query(`CREATE INDEX "IDX_attribute_entity_value_hash" ON "attribute_entity" USING hash ("value") `)
        await db.query(`CREATE UNIQUE INDEX "IDX_attribute_entity_key_value" ON "attribute_entity" ("key", "value") `)
        await db.query(`CREATE TABLE "nft_attribute_entity" ("id" character varying NOT NULL, "nft_id" character varying NOT NULL, "attribute_id" character varying NOT NULL, CONSTRAINT "PK_b0c8f0c8bc6717ef1cb790b46eb" PRIMARY KEY ("id"))`)
        await db.query(`CREATE INDEX "IDX_nft_attribute_entity_nft_id" ON "nft_attribute_entity" ("nft_id") `)
        await db.query(`CREATE INDEX "IDX_nft_attribute_entity_attribute_id" ON "nft_attribute_entity" ("attribute_id") `)
        await db.query(`CREATE UNIQUE INDEX "IDX_nft_attribute_entity_nft_attribute" ON "nft_attribute_entity" ("nft_id", "attribute_id") `)
        await db.query(`ALTER TABLE "nft_attribute_entity" ADD CONSTRAINT "FK_nft_attribute_entity_nft" FOREIGN KEY ("nft_id") REFERENCES "nft_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`)
        await db.query(`ALTER TABLE "nft_attribute_entity" ADD CONSTRAINT "FK_nft_attribute_entity_attribute" FOREIGN KEY ("attribute_id") REFERENCES "attribute_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`)
    }

    async down(db) {
        await db.query(`ALTER TABLE "nft_attribute_entity" DROP CONSTRAINT "FK_nft_attribute_entity_attribute"`)
        await db.query(`ALTER TABLE "nft_attribute_entity" DROP CONSTRAINT "FK_nft_attribute_entity_nft"`)
        await db.query(`DROP INDEX "public"."IDX_nft_attribute_entity_nft_attribute"`)
        await db.query(`DROP INDEX "public"."IDX_nft_attribute_entity_attribute_id"`)
        await db.query(`DROP INDEX "public"."IDX_nft_attribute_entity_nft_id"`)
        await db.query(`DROP TABLE "nft_attribute_entity"`)
        await db.query(`DROP INDEX "public"."IDX_attribute_entity_key_value"`)
        await db.query(`DROP INDEX "public"."IDX_attribute_entity_value_hash"`)
        await db.query(`DROP INDEX "public"."IDX_attribute_entity_key"`)
        await db.query(`DROP TABLE "attribute_entity"`)
    }
}
