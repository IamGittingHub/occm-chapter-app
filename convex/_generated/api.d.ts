/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as appSettings from "../appSettings.js";
import type * as auth from "../auth.js";
import type * as claims from "../claims.js";
import type * as committeeMembers from "../committeeMembers.js";
import type * as communicationAssignments from "../communicationAssignments.js";
import type * as communicationLogs from "../communicationLogs.js";
import type * as crons from "../crons.js";
import type * as dashboard from "../dashboard.js";
import type * as debug from "../debug.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as members from "../members.js";
import type * as migrations from "../migrations.js";
import type * as prayerAssignments from "../prayerAssignments.js";
import type * as testAccess from "../testAccess.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  appSettings: typeof appSettings;
  auth: typeof auth;
  claims: typeof claims;
  committeeMembers: typeof committeeMembers;
  communicationAssignments: typeof communicationAssignments;
  communicationLogs: typeof communicationLogs;
  crons: typeof crons;
  dashboard: typeof dashboard;
  debug: typeof debug;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  members: typeof members;
  migrations: typeof migrations;
  prayerAssignments: typeof prayerAssignments;
  testAccess: typeof testAccess;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
