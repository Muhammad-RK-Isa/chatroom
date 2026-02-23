import { publicProcedure } from "../index";

export const healthCheck = publicProcedure
	.route({ method: "GET" })
	.handler(() => "OK");
