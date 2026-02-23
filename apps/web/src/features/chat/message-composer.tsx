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
import { Input } from "~/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "~/components/ui/popover";

interface MessageComposerProps {
	disabled: boolean;
	onSend: (text: string) => void;
	onTypingChange: (isTyping: boolean) => void;
}

const TYPING_IDLE_DELAY_MS = 3000;

export function MessageComposer({
	disabled,
	onSend,
	onTypingChange,
}: MessageComposerProps) {
	const [text, setText] = useState("");
	const [isOpen, setIsOpen] = useState(false);
	const typingTimeoutRef = useRef<number | null>(null);
	const inputRef = useRef<HTMLInputElement | null>(null);

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
			emitStoppedTyping();
		},
		[disabled, emitStoppedTyping, onSend, text]
	);

	const handleChange = useCallback(
		(event: ChangeEvent<HTMLInputElement>) => {
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
		(event: KeyboardEvent<HTMLInputElement>) => {
			if (event.key === "Enter" && !event.shiftKey) {
				event.preventDefault();
				handleSubmit();
				inputRef.current?.focus();
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
			className="relative flex items-end gap-2 px-3 py-3"
			onSubmit={handleSubmit}
		>
			<Popover onOpenChange={setIsOpen} open={isOpen}>
				<PopoverTrigger
					render={
						<Button
							className="absolute bottom-4 left-4"
							disabled={disabled}
							size="icon"
							variant="ghost"
						>
							<Smile className="size-4" />
						</Button>
					}
				/>
				<PopoverContent align="start" className="w-fit p-0" side="top">
					<EmojiPicker
						className="h-60"
						onEmojiSelect={({ emoji }) => {
							setIsOpen(false);
							setText((currentText) => `${currentText}${emoji}`);
							inputRef.current?.focus();
						}}
					>
						<EmojiPickerSearch />
						<EmojiPickerContent />
						<EmojiPickerFooter />
					</EmojiPicker>
				</PopoverContent>
			</Popover>

			<Input
				className="h-10 pr-10 pl-9"
				disabled={disabled}
				onChange={handleChange}
				onKeyDown={handleKeyDown}
				placeholder={disabled ? "Messaging disabled" : "Type a message..."}
				ref={inputRef}
				value={text}
			/>

			<Button
				className="absolute right-4 bottom-4"
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
