module.exports = class Data1774691683926 {
    name = 'Data1774691683926'

    async up(db) {
        await db.query(`ALTER TABLE "collection_entity" ADD "collection_type" character varying(7)`)
        await db.query(`UPDATE "collection_entity" SET "collection_type" = 'UNIQUES' WHERE "id" LIKE 'u-%'`)
        await db.query(`UPDATE "collection_entity" SET "collection_type" = 'NFTS' WHERE "collection_type" IS NULL`)
        await db.query(`ALTER TABLE "collection_entity" ALTER COLUMN "collection_type" SET NOT NULL`)
        await db.query(`CREATE INDEX "IDX_bea8b3f795e5c345876660ad44" ON "collection_entity" ("collection_type") `)
    }

    async down(db) {
        await db.query(`DROP INDEX "public"."IDX_bea8b3f795e5c345876660ad44"`)
        await db.query(`ALTER TABLE "collection_entity" DROP COLUMN "collection_type"`)
    }
}
