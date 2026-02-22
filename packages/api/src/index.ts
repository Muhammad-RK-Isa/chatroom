import { requireAuth } from "./middleware";
import { publicProcedure } from "./procedure";

export { o, publicProcedure } from "./procedure";

export const protectedProcedure = publicProcedure.use(requireAuth);
