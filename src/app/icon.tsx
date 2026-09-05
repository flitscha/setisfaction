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
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ width: size * 0.16, height: size * 0.32, background: "white", borderRadius: size * 0.04 }} />
          <div style={{ width: size * 0.24, height: size * 0.06, background: "white" }} />
          <div style={{ width: size * 0.16, height: size * 0.32, background: "white", borderRadius: size * 0.04 }} />
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
