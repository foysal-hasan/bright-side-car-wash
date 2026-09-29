-- CreateTable
CREATE TABLE "Section" (
    "id" TEXT NOT NULL,
    "section_key" TEXT NOT NULL,
    "section_type" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaFile" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Section_section_key_key" ON "Section"("section_key");

-- CreateIndex
CREATE INDEX "Section_section_key_idx" ON "Section"("section_key");

-- CreateIndex
CREATE INDEX "Section_is_active_sort_order_idx" ON "Section"("is_active", "sort_order");

-- CreateIndex
CREATE INDEX "MediaFile_filename_idx" ON "MediaFile"("filename");

-- CreateIndex
CREATE INDEX "MediaFile_mime_type_idx" ON "MediaFile"("mime_type");
