import { TitleComponent } from "./TitleComponent.tsx";
import { SubtitleComponent } from "./SubtitleComponent.tsx";
import { ProgressBarComponent } from "./ProgressBarComponent.tsx";
import { BackgroundComponent } from "./BackgroundComponent.tsx";

export type ComponentType = React.ComponentType<any>;

const registry = new Map<string, ComponentType>();

// Register built-in components
registry.set("Title", TitleComponent);
registry.set("Subtitle", SubtitleComponent);
registry.set("ProgressBar", ProgressBarComponent);
registry.set("Background", BackgroundComponent);

export function registerComponent(name: string, component: ComponentType): void {
  registry.set(name, component);
}

export function getComponent(name: string | ComponentType): ComponentType | null {
  if (typeof name === "function") {
    return name; // Already a React component
  }
  return registry.get(name) || null;
}

export function listComponents(): string[] {
  return Array.from(registry.keys());
}
