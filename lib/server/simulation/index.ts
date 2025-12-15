/**
 * Simulation Module - Phase 8
 *
 * Exports for simulation/replay mode functionality
 */

export type { SimulationDataOptions } from "./loadSimulationData";
export { loadSimulationData } from "./loadSimulationData";
export type { SimulationTick } from "./SimulationController";
export { SimulationController } from "./SimulationController";
export { getSimulationController, setSimulationController } from "./simulationSingleton";
