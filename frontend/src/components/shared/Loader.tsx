interface LoaderProps {
  size?: number;
  className?: string;
}

export function Loader({ size = 18, className = "" }: LoaderProps) {
  return (
    <div
      className={`inline-block rounded-full border-2 border-current border-t-transparent ${className}`}
      style={{
        width: size,
        height: size,
        borderTopColor: "transparent",
        animation: "spin 0.8s linear infinite",
        opacity: 0.7,
      }}
    />
  );
}
