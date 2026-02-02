// Artifact system exports
export { ArtifactContainer } from "./ArtifactContainer";
export { ArtifactFullscreenModal } from "./ArtifactFullscreenModal";
export { MessageWithArtifacts } from "./MessageWithArtifacts";

// Re-export types
export type { Artifact, ArtifactType, ParsedMessage } from "@/lib/artifactParser";
export { parseMessageForArtifacts } from "@/lib/artifactParser";
