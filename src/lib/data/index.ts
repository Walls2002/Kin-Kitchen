import "server-only";
import { isDemo } from "../env";
import { demoRepo } from "./demo";
import type { Repo } from "./repo";
import { createSupabaseRepo } from "./supabase";

export { RepoError } from "./repo";

export async function getRepo(): Promise<Repo> {
  return isDemo ? demoRepo : createSupabaseRepo();
}
