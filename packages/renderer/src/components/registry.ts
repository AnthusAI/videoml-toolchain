import { TitleComponent } from "./TitleComponent.tsx";
import { SubtitleComponent } from "./SubtitleComponent.tsx";
import { ProgressBarComponent } from "./ProgressBarComponent.tsx";
import { RectangleComponent } from "./RectangleComponent.tsx";

export type ComponentType = React.ComponentType<any>;

const registry = new Map<string, ComponentType>();

// Register built-in components
registry.set("Title", TitleComponent);
registry.set("Subtitle", SubtitleComponent);
registry.set("ProgressBar", ProgressBarComponent);
registry.set("Rectangle", RectangleComponent);
// Backward compatibility
registry.set("Background", RectangleComponent);

export function registerComponent(name: string, component: ComponentType): void {
  registry.set(name, component);
}

export function getComponent(name: string | ComponentType): ComponentType | null {
  if (typeof name === "function") {
    return name; // Already a React component
  }

  const result = registry.get(name);

  if (!result) {
    const keys = Array.from(registry.keys());
    console.error(`[Registry] Component "${name}" not found. Available:`, keys);
  }

  return result || null;
}

export function listComponents(): string[] {
  return Array.from(registry.keys());
}
