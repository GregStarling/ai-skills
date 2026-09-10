import {normalizeSlug} from "./slug.mjs";
export const link = name => "/items/" + normalizeSlug(name);
