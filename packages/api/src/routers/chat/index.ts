import { acceptMessageRequest } from "./accept-message-request";
import { blockUser } from "./block-user";
import { createGroup } from "./create-group";
import { getThread } from "./get-thread";
import { listConversations } from "./list-conversations";
import { markConversationSeen } from "./mark-conversation-seen";
import { openDm } from "./open-dm";
import { renameGroup } from "./rename-group";
import { searchUsers } from "./search-users";
import { sendMessage } from "./send-message";
import { setConversationMute } from "./set-conversation-mute";
import { setTyping } from "./set-typing";
import { stream } from "./stream";
import { unblockUser } from "./unblock-user";
import { updatePresence } from "./update-presence";

export const chatRouter = {
	listConversations,
	getThread,
	searchUsers,
	openDm,
	createGroup,
	renameGroup,
	sendMessage,
	markConversationSeen,
	setTyping,
	setConversationMute,
	blockUser,
	unblockUser,
	acceptMessageRequest,
	updatePresence,
	stream,
};
