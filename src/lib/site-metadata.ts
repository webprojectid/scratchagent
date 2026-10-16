export const SITE_ORIGIN = "https://www.scratchagent.web.id";
export const SITE_DESCRIPTION = "Turn your idea into a clear plan, PRD, and actionable tasks.";

export const SHARE_IMAGE = {
  url: `${SITE_ORIGIN}/social/scratch-agent-share-v3.jpg`,
  secureUrl: `${SITE_ORIGIN}/social/scratch-agent-share-v3.jpg`,
  width: 1200,
  height: 630,
  type: "image/jpeg",
  alt: "Scratch Agent — From ideas to execution.",
};

export const siteOpenGraph = {
  type: "website" as const,
  siteName: "Scratch Agent",
  title: "Scratch Agent",
  description: SITE_DESCRIPTION,
  images: [SHARE_IMAGE],
};
