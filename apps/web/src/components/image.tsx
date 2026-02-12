import type React from "react";

const DEFAULT_QUALITY = 75;

const DEFAULT_SIZES = [640, 750, 828, 1080, 1200, 1920, 2048, 3840];

type Loading = "eager" | "lazy";
type Decoding = "async" | "sync" | "auto";
type ObjectFit = "contain" | "cover" | "fill" | "none" | "scale-down";
type Placeholder = "blur" | "empty";

interface LoaderProps {
	src: string;
	width: number;
	quality: number;
}

type Loader = (props: LoaderProps) => string;

interface ImageProps {
	src: string;
	alt: string;
	width?: number;
	height?: number;
	fill?: boolean;
	loader?: Loader;
	quality?: number;
	priority?: boolean;
	loading?: Loading;
	decoding?: Decoding;
	placeholder?: Placeholder;
	blurDataURL?: string;
	objectFit?: ObjectFit;
	objectPosition?: string;
	sizes?: string;
	unoptimized?: boolean;
	className?: string;
	style?: React.CSSProperties;
	onLoad?: (event: React.SyntheticEvent<HTMLImageElement>) => void;
	onError?: (event: React.SyntheticEvent<HTMLImageElement>) => void;
}

function generateSrcSet(
	src: string,
	loader: Loader | undefined,
	quality: number
): string {
	if (loader) {
		return DEFAULT_SIZES.map((width) => {
			const url = loader({ src, width, quality });
			return `${url} ${width}w`;
		}).join(", ");
	}

	return `${src} 1x, ${src} 2x`;
}

function getWrapperStyles(
	fill: boolean | undefined,
	width: number | undefined,
	height: number | undefined,
	style: React.CSSProperties | undefined
): React.CSSProperties {
	const baseStyles: React.CSSProperties = {
		position: "relative",
		...style,
	};

	if (!fill) {
		return {
			...baseStyles,
			width: width ?? "auto",
			height: height ?? "auto",
		};
	}

	return baseStyles;
}

function getImageStyles(
	fill: boolean | undefined,
	objectFit: ObjectFit | undefined,
	objectPosition: string | undefined
): React.CSSProperties {
	if (!fill) {
		return {};
	}

	return {
		position: "absolute",
		inset: 0,
		width: "100%",
		height: "100%",
		objectFit: objectFit ?? "cover",
		objectPosition: objectPosition ?? "center",
	};
}

export function Image({
	src,
	alt,
	width,
	height,
	fill = false,
	loader,
	quality = DEFAULT_QUALITY,
	priority = false,
	loading,
	decoding = "async",
	placeholder = "empty",
	blurDataURL,
	objectFit,
	objectPosition,
	sizes,
	unoptimized = false,
	className,
	style,
	onLoad,
	onError,
}: ImageProps) {
	if (!fill && (width === undefined || height === undefined)) {
		throw new Error(
			'Image with src "' +
				src +
				'" requires either "width" and "height" or "fill" property'
		);
	}

	const imageSrc = unoptimized
		? src
		: (loader?.({ src, width: width ?? 0, quality }) ?? src);

	const srcSet = unoptimized ? undefined : generateSrcSet(src, loader, quality);

	const actualLoading = priority ? "eager" : (loading ?? "lazy");
	const fetchPriority = priority ? "high" : undefined;

	const wrapperStyles = getWrapperStyles(fill, width, height, style);
	const imageStyles = getImageStyles(fill, objectFit, objectPosition);

	const shouldShowBlurPlaceholder = placeholder === "blur" && blurDataURL;

	return (
		<div className={className} style={wrapperStyles}>
			{shouldShowBlurPlaceholder && (
				<img
					alt=""
					aria-hidden="true"
					height={fill ? 1 : height}
					src={blurDataURL}
					style={{
						...imageStyles,
						position: fill ? "absolute" : "absolute",
						inset: 0,
						width: "100%",
						height: "100%",
						filter: "blur(20px)",
						transform: "scale(1.1)",
						transition: "opacity 0.2s",
						pointerEvents: "none",
					}}
					width={fill ? 1 : width}
				/>
			)}
			<picture>
				{!unoptimized && (
					<>
						<source sizes={sizes} srcSet={srcSet} type="image/avif" />
						<source sizes={sizes} srcSet={srcSet} type="image/webp" />
					</>
				)}
				{/* biome-ignore lint: <img> element's onLoad and onError are valid image load events */}
				<img
					alt={alt}
					decoding={decoding}
					fetchPriority={fetchPriority}
					height={fill ? undefined : height}
					loading={actualLoading}
					onError={onError}
					onLoad={onLoad}
					src={imageSrc}
					style={imageStyles}
					width={fill ? undefined : width}
				/>
			</picture>
		</div>
	);
}
