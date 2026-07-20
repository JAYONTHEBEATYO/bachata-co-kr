import { communities } from "./communities";
import type { Community } from "./types";

export const getCommunities = async (): Promise<Community[]> => communities;
