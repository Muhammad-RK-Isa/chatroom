import { SendHorizontal, Smile } from "lucide-react";
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
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "~/components/ui/popover";
import { Textarea } from "~/components/ui/textarea";

interface MessageComposerProps {
	disabled: boolean;
	onSend: (text: string) => void;
	onTypingChange: (isTyping: boolean) => void;
}

const TYPING_IDLE_DELAY_MS = 2200;

export function MessageComposer({
	disabled,
	onSend,
	onTypingChange,
}: MessageComposerProps) {
	const [text, setText] = useState("");
	const [isOpen, setIsOpen] = useState(false);
	const typingTimeoutRef = useRef<number | null>(null);
	const textareaRef = useRef<HTMLTextAreaElement | null>(null);

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

			if (disabled) {
				return;
			}

			const trimmedText = text.trim();
			if (!trimmedText) {
				return;
			}

			onSend(trimmedText);
			setText("");
			requestAnimationFrame(() => {
				textareaRef.current?.focus();
			});
			emitStoppedTyping();
		},
		[disabled, emitStoppedTyping, onSend, text]
	);

	const handleChange = useCallback(
		(event: ChangeEvent<HTMLTextAreaElement>) => {
			const nextValue = event.target.value;
			setText(nextValue);

			if (disabled) {
				return;
			}

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
		[clearTypingTimeout, disabled, emitStoppedTyping, onTypingChange]
	);

	const handleKeyDown = useCallback(
		(event: KeyboardEvent<HTMLTextAreaElement>) => {
			if (event.key === "Enter" && !event.shiftKey) {
				event.preventDefault();
				handleSubmit();
			}
		},
		[handleSubmit]
	);

	useEffect(() => {
		return () => {
			emitStoppedTyping();
		};
	}, [emitStoppedTyping]);

	return (
		<form
			className="flex items-end gap-2 border-border border-t bg-card px-3 py-3"
			onSubmit={handleSubmit}
		>
			<Popover onOpenChange={setIsOpen} open={isOpen}>
				<PopoverTrigger
					render={
						<Button disabled={disabled} size="icon" variant="ghost">
							<Smile className="size-4" />
						</Button>
					}
				/>
				<PopoverContent className="w-fit p-0" side="top">
					<EmojiPicker
						className="h-[342px]"
						onEmojiSelect={({ emoji }) => {
							setIsOpen(false);
							setText((currentText) => `${currentText}${emoji}`);
							requestAnimationFrame(() => {
								textareaRef.current?.focus();
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
				className="h-9 max-h-32 min-h-9 resize-none py-2"
				disabled={disabled}
				onChange={handleChange}
				onKeyDown={handleKeyDown}
				placeholder={disabled ? "Messaging disabled" : "Type a message..."}
				ref={textareaRef}
				rows={1}
				value={text}
			/>

			<Button
				disabled={disabled || text.trim().length === 0}
				size="icon"
				type="submit"
			>
				<SendHorizontal className="size-4" />
				<span className="sr-only">Send message</span>
			</Button>
		</form>
	);
}
