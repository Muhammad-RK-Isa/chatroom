import { chatStreamEventSchema } from "@chatroom/validators";
import { eventIterator } from "@orpc/server";
import { protectedProcedure } from "../../index";
import { requireAuthenticatedUserId } from "../../lib/utils";
import { subscribeChatEvents } from "./events";
import { chatErrorMap } from "./shared";

export const stream = protectedProcedure
	.route({ method: "GET", path: "/chat/stream" })
	.output(eventIterator(chatStreamEventSchema))
	.errors(chatErrorMap)
	.handler(async function* ({ context, signal }) {
		const userId = requireAuthenticatedUserId(context);
		const streamSignal = signal ?? new AbortController().signal;

		yield {
			type: "chat.connected",
			at: new Date(),
		};

		for await (const event of subscribeChatEvents(userId, streamSignal)) {
			yield event;
		}
	});
