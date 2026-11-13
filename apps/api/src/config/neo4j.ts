import neo4j, { type Driver } from "neo4j-driver";
import { env } from "./env.js";

export function createNeo4jDriver(): Driver | undefined {
  if (!env.NEO4J_URI || !env.NEO4J_USERNAME || !env.NEO4J_PASSWORD) return undefined;
  return neo4j.driver(env.NEO4J_URI, neo4j.auth.basic(env.NEO4J_USERNAME, env.NEO4J_PASSWORD));
}
