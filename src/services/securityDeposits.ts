import { MOCK_SECURITY_DEPOSITS } from "@/mock/deposits";
import type { SecurityDeposit, SecurityDepositFilters } from "@/types/securityDeposit";

let deposits: SecurityDeposit[] = structuredClone(MOCK_SECURITY_DEPOSITS);
let forceError: string | null = null;

function assertOk() {
  if (forceError) throw new Error(forceError);
}

export function filterDeposits(
  list: SecurityDeposit[],
  filters?: SecurityDepositFilters,
): SecurityDeposit[] {
  if (!filters) return list;
  return list.filter((d) => {
    if (filters.status && filters.status !== "ALL" && d.status !== filters.status) return false;
    if (filters.networkType && filters.networkType !== "ALL" && d.networkType !== filters.networkType)
      return false;
    if (filters.userId && d.userId !== filters.userId) return false;
    if (filters.rideId && d.rideId !== filters.rideId) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!`${d.id} ${d.rideId} ${d.userId}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

export const securityDepositService = {
  async getDeposits(filters?: SecurityDepositFilters): Promise<SecurityDeposit[]> {
    assertOk();
    return structuredClone(filterDeposits(deposits, filters));
  },

  async getDepositById(id: string): Promise<SecurityDeposit | null> {
    assertOk();
    const d = deposits.find((x) => x.id === id);
    return d ? structuredClone(d) : null;
  },

  async upsertDeposit(deposit: SecurityDeposit): Promise<SecurityDeposit> {
    assertOk();
    const idx = deposits.findIndex((d) => d.id === deposit.id);
    if (idx >= 0) deposits[idx] = deposit;
    else deposits = [deposit, ...deposits];
    return structuredClone(deposit);
  },

  __resetForTests() {
    deposits = structuredClone(MOCK_SECURITY_DEPOSITS);
    forceError = null;
  },

  __setErrorForTests(msg: string | null) {
    forceError = msg;
  },
};
