import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireCommitteeMember } from "./lib/auth";

/**
 * Get all app settings.
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireCommitteeMember(ctx);
    return await ctx.db.query("appSettings").collect();
  },
});

/**
 * Get a specific setting by key.
 */
export const getByKey = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    await requireCommitteeMember(ctx);

    const setting = await ctx.db
      .query("appSettings")
      .withIndex("by_settingKey", (q) => q.eq("settingKey", args.key))
      .first();

    return setting?.settingValue ?? null;
  },
});

/**
 * Get all settings (alias for getAsMap, used by settings page).
 */
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    await requireCommitteeMember(ctx);

    const settings = await ctx.db.query("appSettings").collect();

    // Return as an object with snake_case keys for backwards compatibility
    const result: Record<string, string> = {};
    for (const setting of settings) {
      result[setting.settingKey] = setting.settingValue;
    }

    return result;
  },
});

/**
 * Get settings as a key-value map.
 */
export const getAsMap = query({
  args: {},
  handler: async (ctx) => {
    await requireCommitteeMember(ctx);

    const settings = await ctx.db.query("appSettings").collect();

    const map: Record<string, string> = {};
    for (const setting of settings) {
      map[setting.settingKey] = setting.settingValue;
    }

    return map;
  },
});

/**
 * Set a setting value (upsert).
 */
export const set = mutation({
  args: {
    key: v.string(),
    value: v.string(),
  },
  handler: async (ctx, args) => {
    await requireCommitteeMember(ctx);

    const existing = await ctx.db
      .query("appSettings")
      .withIndex("by_settingKey", (q) => q.eq("settingKey", args.key))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        settingValue: args.value,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("appSettings", {
        settingKey: args.key,
        settingValue: args.value,
        updatedAt: now,
      });
    }
  },
});

/**
 * Delete a setting.
 */
export const remove = mutation({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    await requireCommitteeMember(ctx);

    const setting = await ctx.db
      .query("appSettings")
      .withIndex("by_settingKey", (q) => q.eq("settingKey", args.key))
      .first();

    if (setting) {
      await ctx.db.delete(setting._id);
    }
  },
});

/**
 * Initialize default settings if they don't exist.
 */
export const initDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    await requireCommitteeMember(ctx);

    const defaults: Record<string, string> = {
      unresponsive_threshold_days: "30",
      rotation_day_of_month: "1",
    };

    const now = Date.now();

    for (const [key, value] of Object.entries(defaults)) {
      const existing = await ctx.db
        .query("appSettings")
        .withIndex("by_settingKey", (q) => q.eq("settingKey", key))
        .first();

      if (!existing) {
        await ctx.db.insert("appSettings", {
          settingKey: key,
          settingValue: value,
          updatedAt: now,
        });
      }
    }
  },
});

/**
 * Set a setting value without authentication (for migration only).
 * Remove this after migration is complete.
 */
export const setFromMigration = mutation({
  args: {
    key: v.string(),
    value: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("appSettings")
      .withIndex("by_settingKey", (q) => q.eq("settingKey", args.key))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        settingValue: args.value,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("appSettings", {
        settingKey: args.key,
        settingValue: args.value,
        updatedAt: now,
      });
    }
  },
});
