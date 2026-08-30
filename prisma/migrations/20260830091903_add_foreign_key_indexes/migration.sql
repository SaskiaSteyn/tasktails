-- CreateIndex
CREATE INDEX "CartItem_userId_idx" ON "CartItem"("userId");

-- CreateIndex
CREATE INDEX "InventoryItem_userId_idx" ON "InventoryItem"("userId");

-- CreateIndex
CREATE INDEX "Pet_userId_idx" ON "Pet"("userId");

-- CreateIndex
CREATE INDEX "Subtask_taskId_idx" ON "Subtask"("taskId");

-- CreateIndex
CREATE INDEX "TelemetryEvent_userId_eventType_idx" ON "TelemetryEvent"("userId", "eventType");

-- CreateIndex
CREATE INDEX "Transaction_userId_idx" ON "Transaction"("userId");
