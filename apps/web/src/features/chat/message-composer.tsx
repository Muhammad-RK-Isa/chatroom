import { SendHorizontalIcon, SmileIcon, XIcon } from "lucide-react";
import {
	type ChangeEvent,
	type FormEvent,
	type KeyboardEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { Button } from "~/components/ui/button";
import {
	EmojiPicker,
	EmojiPickerContent,
	EmojiPickerFooter,
	EmojiPickerSearch,
} from "~/components/ui/emoji-picker";
import { Kbd } from "~/components/ui/kbd";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "~/components/ui/popover";
import { Textarea } from "~/components/ui/textarea";

interface MessageComposerProps {
	replyTo: { id: string; senderName: string; text: string } | null;
	onCancelReply: () => void;
	onSend: (input: { text: string; replyToMessageId?: string }) => void;
	onTypingChange: (isTyping: boolean) => void;
}

const TYPING_IDLE_DELAY_MS = 3000;
const MIN_TEXTAREA_HEIGHT_PX = 48;
const MAX_TEXTAREA_HEIGHT_PX = 120;
const EDITABLE_ELEMENT_SELECTOR =
	"input, textarea, select, [contenteditable='true'], [contenteditable='']";

export function MessageComposer({
	replyTo,
	onCancelReply,
	onSend,
	onTypingChange,
}: MessageComposerProps) {
	const [text, setText] = useState("");
	const [isOpen, setIsOpen] = useState(false);
	const typingTimeoutRef = useRef<number | null>(null);
	const inputRef = useRef<HTMLTextAreaElement | null>(null);

	const resizeTextarea = useCallback((textarea: HTMLTextAreaElement) => {
		textarea.style.height = "0px";
		const clampedHeight = Math.min(
			Math.max(textarea.scrollHeight, MIN_TEXTAREA_HEIGHT_PX),
			MAX_TEXTAREA_HEIGHT_PX
		);
		textarea.style.height = `${clampedHeight}px`;
		textarea.style.overflowY =
			textarea.scrollHeight > MAX_TEXTAREA_HEIGHT_PX ? "auto" : "hidden";
	}, []);

	const clearTypingTimeout = useCallback(() => {
		if (typingTimeoutRef.current) {
			window.clearTimeout(typingTimeoutRef.current);
			typingTimeoutRef.current = null;
		}
	}, []);

	const emitStoppedTyping = useCallback(() => {
		clearTypingTimeout();
		onTypingChange(false);
	}, [clearTypingTimeout, onTypingChange]);

	const handleSubmit = useCallback(
		(event?: FormEvent) => {
			event?.preventDefault();

			const trimmedText = text.trim();
			if (!trimmedText) {
				return;
			}

			onSend({
				text: trimmedText,
				replyToMessageId: replyTo?.id,
			});
			setText("");
			emitStoppedTyping();
			window.requestAnimationFrame(() => {
				if (inputRef.current) {
					resizeTextarea(inputRef.current);
				}
				inputRef.current?.focus();
			});
		},
		[emitStoppedTyping, onSend, replyTo?.id, resizeTextarea, text]
	);

	const handleChange = useCallback(
		(event: ChangeEvent<HTMLTextAreaElement>) => {
			const nextValue = event.target.value;
			setText(nextValue);
			resizeTextarea(event.currentTarget);

			if (nextValue.trim().length === 0) {
				emitStoppedTyping();
				return;
			}

			onTypingChange(true);
			clearTypingTimeout();
			typingTimeoutRef.current = window.setTimeout(() => {
				onTypingChange(false);
				typingTimeoutRef.current = null;
			}, TYPING_IDLE_DELAY_MS);
		},
		[clearTypingTimeout, emitStoppedTyping, onTypingChange, resizeTextarea]
	);

	const handleKeyDown = useCallback(
		(event: KeyboardEvent<HTMLTextAreaElement>) => {
			if (event.key === "Escape" && replyTo) {
				event.preventDefault();
				event.stopPropagation();
				onCancelReply();
				inputRef.current?.focus();
				return;
			}

			if (event.key === "Enter" && !event.shiftKey) {
				event.preventDefault();
				handleSubmit();
				inputRef.current?.focus();
			}
		},
		[handleSubmit, onCancelReply, replyTo]
	);

	const focusComposerInput = useCallback(() => {
		inputRef.current?.focus();
	}, []);

	const openEmojiPicker = useCallback(() => {
		setIsOpen(true);
		window.requestAnimationFrame(() => {
			inputRef.current?.focus();
		});
	}, []);

	useEffect(() => {
		if (inputRef.current) {
			resizeTextarea(inputRef.current);
		}
	}, [resizeTextarea]);

	useEffect(() => {
		if (!replyTo) {
			return;
		}

		window.requestAnimationFrame(() => {
			inputRef.current?.focus();
		});
	}, [replyTo]);

	useEffect(() => {
		const handleGlobalKeyDown = (event: globalThis.KeyboardEvent) => {
			if (
				event.defaultPrevented ||
				event.repeat ||
				event.metaKey ||
				event.ctrlKey ||
				event.altKey
			) {
				return;
			}

			const eventTarget = event.target;
			if (
				eventTarget instanceof HTMLElement &&
				eventTarget.closest(EDITABLE_ELEMENT_SELECTOR)
			) {
				return;
			}

			if (event.key === "/") {
				event.preventDefault();
				focusComposerInput();
				return;
			}

			if (event.key.toLowerCase() === "e") {
				event.preventDefault();
				openEmojiPicker();
			}
		};

		window.addEventListener("keydown", handleGlobalKeyDown);

		return () => {
			window.removeEventListener("keydown", handleGlobalKeyDown);
		};
	}, [focusComposerInput, openEmojiPicker]);

	useEffect(() => {
		return () => {
			emitStoppedTyping();
		};
	}, [emitStoppedTyping]);

	return (
		<form className="px-3 py-3" onSubmit={handleSubmit}>
			{replyTo ? (
				<div className="mb-2 flex items-start justify-between gap-2 rounded-xl border bg-muted/50 px-3 py-2">
					<div className="min-w-0">
						<p className="font-medium text-[11px] text-muted-foreground">
							Replying to {replyTo.senderName}
						</p>
						<p className="truncate text-xs">{replyTo.text}</p>
					</div>
					<div className="flex items-center gap-2">
						<Kbd className="h-6">Esc</Kbd>
						<Button
							className="size-6"
							onClick={onCancelReply}
							size="icon"
							type="button"
							variant="ghost"
						>
							<XIcon className="size-4" />
							<span className="sr-only">Cancel reply</span>
						</Button>
					</div>
				</div>
			) : null}

			<div className="relative flex items-end gap-2">
				<Popover onOpenChange={setIsOpen} open={isOpen}>
					<PopoverTrigger
						render={
							<Button
								className="absolute bottom-1.5 left-1"
								size="icon"
								variant="ghost"
							>
								<SmileIcon className="size-4" />
							</Button>
						}
					/>
					<PopoverContent align="start" className="w-fit p-0" side="top">
						<EmojiPicker
							className="h-60"
							onEmojiSelect={({ emoji }) => {
								setIsOpen(false);
								setText((currentText) => `${currentText}${emoji}`);
								window.requestAnimationFrame(() => {
									if (inputRef.current) {
										resizeTextarea(inputRef.current);
									}
									inputRef.current?.focus();
								});
							}}
						>
							<EmojiPickerSearch />
							<EmojiPickerContent />
							<EmojiPickerFooter />
						</EmojiPicker>
					</PopoverContent>
				</Popover>

				<Textarea
					className="h-12 max-h-30 min-h-12 rounded-4xl px-10 py-3"
					onChange={handleChange}
					onKeyDown={handleKeyDown}
					placeholder="Type a message..."
					ref={inputRef}
					rows={1}
					value={text}
				/>

				<Button
					className="absolute right-1 bottom-1.5"
					disabled={text.trim().length === 0}
					size="icon"
					type="submit"
				>
					<SendHorizontalIcon />
					<span className="sr-only">Send message</span>
				</Button>
			</div>
		</form>
	);
}
