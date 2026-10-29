import { espnProvider } from "./espn";
import { footballDataProvider } from "./football-data";
import type { FixturesProvider } from "./types";

/**
 * FIXTURES_PROVIDER=espn (default) | football-data
 * Player stats always come from ESPN, so they're only available when fixtures do too.
 * Switching provider creates new rows (ids are provider-prefixed): treat it as a data reset.
 */
export function getFixturesProvider(): FixturesProvider {
  return process.env.FIXTURES_PROVIDER === "football-data" ? footballDataProvider : espnProvider;
}

export { getEspnMatchDetail } from "./espn";
export type * from "./types";
