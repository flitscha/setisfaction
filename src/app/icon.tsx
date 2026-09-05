import { ImageResponse } from "next/og";

export const contentType = "image/png";

const SIZES = [192, 512];

export function generateImageMetadata() {
  return SIZES.map((size) => ({
    id: String(size),
    size: { width: size, height: size },
    contentType,
  }));
}

// A minimal athlete hanging from a pull-up bar — calisthenics, not a
// weight/dumbbell (which read as a stray "H" at small sizes).
function PullUpFigure({ size }: { size: number }) {
  return (
    <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 100 100" fill="none">
      <line x1="20" y1="15" x2="80" y2="15" stroke="white" strokeWidth="8" strokeLinecap="round" />
      <line x1="30" y1="15" x2="38" y2="45" stroke="white" strokeWidth="7" strokeLinecap="round" />
      <line x1="70" y1="15" x2="62" y2="45" stroke="white" strokeWidth="7" strokeLinecap="round" />
      <circle cx="50" cy="53" r="9" fill="white" />
      <line x1="50" y1="62" x2="50" y2="80" stroke="white" strokeWidth="7" strokeLinecap="round" />
      <line x1="50" y1="80" x2="40" y2="97" stroke="white" strokeWidth="7" strokeLinecap="round" />
      <line x1="50" y1="80" x2="60" y2="97" stroke="white" strokeWidth="7" strokeLinecap="round" />
    </svg>
  );
}

export default async function Icon({ id }: { id: Promise<string> }) {
  const size = Number(await id);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#16a34a",
          borderRadius: size * 0.22,
        }}
      >
        <PullUpFigure size={size} />
      </div>
    ),
    { width: size, height: size },
  );
}
