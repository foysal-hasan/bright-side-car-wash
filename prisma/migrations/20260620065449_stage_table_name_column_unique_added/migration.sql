/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `stages` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "stages_name_key" ON "stages"("name");
