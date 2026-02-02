import { useEffect } from "react";
import { Artifact } from "@/lib/artifactParser";
import { ArtifactContainer } from "./ArtifactContainer";

interface ArtifactFullscreenModalProps {
  artifact: Artifact | null;
  onClose: () => void;
}

export const ArtifactFullscreenModal = ({
  artifact,
  onClose,
}: ArtifactFullscreenModalProps) => {
  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (artifact) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [artifact, onClose]);

  if (!artifact) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <ArtifactContainer
        artifact={artifact}
        isFullscreen
        onFullscreenToggle={onClose}
      />
    </>
  );
};
