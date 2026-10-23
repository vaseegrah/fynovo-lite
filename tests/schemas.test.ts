import { describe, expect, it } from "vitest";
import { SyncedTransaction } from "../models/SyncedTransaction";

describe("transaction persistence", () => {
  it("has a per-brand compound unique index to prevent duplicate source records", () => {
    const index = SyncedTransaction.schema.indexes().find(([keys]) => "userId" in keys && "brand" in keys && "originalTransactionId" in keys);
    expect(index).toBeDefined(); expect(index?.[1].unique).toBe(true);
  });

  it("keeps the legacy integration index non-unique so brand syncs can share transaction IDs", () => {
    const index = SyncedTransaction.schema.indexes().find(([keys]) => "userId" in keys && "integrationId" in keys && "originalTransactionId" in keys);
    expect(index).toBeDefined(); expect(index?.[1].unique).not.toBe(true);
  });
});
