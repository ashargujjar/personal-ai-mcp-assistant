import { databaseConnections, databaseTables } from "@/mock/database";
import { sleep } from "@/lib/utils";
import type { DatabaseConnection, DatabaseTable } from "@/types";

export const databaseService = {
  async listConnections(): Promise<DatabaseConnection[]> {
    await sleep(200);
    return databaseConnections;
  },

  async listTables(connectionId: string): Promise<DatabaseTable[]> {
    await sleep(180);
    return databaseTables.filter((t) => t.connectionId === connectionId);
  },
};
