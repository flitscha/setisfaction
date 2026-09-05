import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
        }}
      >
        <svg width={108} height={108} viewBox="0 0 100 100" fill="none">
          <line x1="20" y1="15" x2="80" y2="15" stroke="white" strokeWidth="8" strokeLinecap="round" />
          <line x1="30" y1="15" x2="38" y2="45" stroke="white" strokeWidth="7" strokeLinecap="round" />
          <line x1="70" y1="15" x2="62" y2="45" stroke="white" strokeWidth="7" strokeLinecap="round" />
          <circle cx="50" cy="53" r="9" fill="white" />
          <line x1="50" y1="62" x2="50" y2="80" stroke="white" strokeWidth="7" strokeLinecap="round" />
          <line x1="50" y1="80" x2="40" y2="97" stroke="white" strokeWidth="7" strokeLinecap="round" />
          <line x1="50" y1="80" x2="60" y2="97" stroke="white" strokeWidth="7" strokeLinecap="round" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
