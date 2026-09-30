import { MOCK_INFRASTRUCTURE } from "@/mock/infrastructure";
import type { InfrastructureComponent } from "@/types/infrastructure";

let components: InfrastructureComponent[] = structuredClone(MOCK_INFRASTRUCTURE);
let forceError = false;

export function __resetInfrastructureForTests(): void {
  components = structuredClone(MOCK_INFRASTRUCTURE);
  forceError = false;
}

export function __setInfrastructureErrorForTests(enabled: boolean): void {
  forceError = enabled;
}

export const infrastructureService = {
  async getComponents(): Promise<InfrastructureComponent[]> {
    if (forceError) throw new Error("Unable to load infrastructure.");
    return structuredClone(components);
  },

  async getComponentById(id: string): Promise<InfrastructureComponent | null> {
    if (forceError) throw new Error("Unable to load infrastructure.");
    return structuredClone(components.find((c) => c.id === id) ?? null);
  },
};

export type InfrastructureService = typeof infrastructureService;
