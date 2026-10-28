-- CreateTable
CREATE TABLE "task_reschedule_history" (
    "id" SERIAL NOT NULL,
    "taskId" INTEGER NOT NULL,
    "previousDueAt" TIMESTAMP(3) NOT NULL,
    "newDueAt" TIMESTAMP(3) NOT NULL,
    "rescheduledById" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_reschedule_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "task_reschedule_history_taskId_createdAt_idx" ON "task_reschedule_history"("taskId", "createdAt");

-- AddForeignKey
ALTER TABLE "task_reschedule_history" ADD CONSTRAINT "task_reschedule_history_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
