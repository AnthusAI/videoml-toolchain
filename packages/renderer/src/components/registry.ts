import { TitleComponent } from "./TitleComponent.tsx";
import { SubtitleComponent } from "./SubtitleComponent.tsx";
import { ProgressBarComponent } from "./ProgressBarComponent.tsx";
import { RectangleComponent } from "./RectangleComponent.tsx";
import { BackgroundComponent } from "./BackgroundComponent.tsx";
import { ColorThemeDemo } from "./demo/ColorThemeDemo.js";

// Layout components
import { TitleSlideLayout } from "./layouts/TitleSlideLayout.js";
import { TwoColumnLayout } from "./layouts/TwoColumnLayout.js";
import { GridLayout } from "./layouts/GridLayout.js";
import { SidebarLayout } from "./layouts/SidebarLayout.js";
import { SplitScreenLayout } from "./layouts/SplitScreenLayout.js";
import { ChapterHeadingLayout } from "./layouts/ChapterHeadingLayout.js";
import { QuoteCardLayout } from "./layouts/QuoteCardLayout.js";
import { FlexPageLayout } from "./layouts/FlexPageLayout.js";
import { BulletListScreenLayout } from "./layouts/BulletListScreenLayout.js";

// Motion graphics components
import { ChyronComponent } from "./motion/ChyronComponent.js";
import { LowerThirdComponent } from "./motion/LowerThirdComponent.js";
import { BulletListComponent } from "./motion/BulletListComponent.js";
import { CalloutComponent } from "./motion/CalloutComponent.js";
import { CodeBlockComponent } from "./motion/CodeBlockComponent.js";
import { IconComponent } from "./motion/IconComponent.js";
import { FontGridComponent } from "./motion/FontGridComponent.js";

export type ComponentType = React.ComponentType<any>;

const registry = new Map<string, ComponentType>();

// Register built-in components
registry.set("Title", TitleComponent);
registry.set("Subtitle", SubtitleComponent);
registry.set("ProgressBar", ProgressBarComponent);
registry.set("Rectangle", RectangleComponent);
registry.set("Background", BackgroundComponent);
registry.set("ColorThemeDemo", ColorThemeDemo);

// Register layout components
registry.set("TitleSlide", TitleSlideLayout);
registry.set("TwoColumn", TwoColumnLayout);
registry.set("Grid", GridLayout);
registry.set("Sidebar", SidebarLayout);
registry.set("SplitScreen", SplitScreenLayout);
registry.set("ChapterHeading", ChapterHeadingLayout);
registry.set("QuoteCard", QuoteCardLayout);
registry.set("FlexPage", FlexPageLayout);
registry.set("BulletListScreen", BulletListScreenLayout);

// Register motion graphics components
registry.set("Chyron", ChyronComponent);
registry.set("LowerThird", LowerThirdComponent);
registry.set("BulletList", BulletListComponent);
registry.set("Callout", CalloutComponent);
registry.set("CodeBlock", CodeBlockComponent);
registry.set("Icon", IconComponent);
registry.set("FontGrid", FontGridComponent);

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
