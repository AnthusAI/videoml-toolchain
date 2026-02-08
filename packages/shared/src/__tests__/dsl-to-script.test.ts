import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { dslToScriptData } from "../dsl-to-script.js";
import type { CompositionSpec } from "@videoml/toolchain/dsl";

describe('dslToScriptData', () => {
  it('should preserve layers from CompositionSpec', () => {
    const composition: CompositionSpec = {
      id: 'test-composition',
      title: 'Test Composition',
      timeline: [
        {
          id: 'scene-1',
          title: 'Scene 1',
          items: [
            {
              kind: 'cue',
              id: 'cue-1',
              label: 'Cue 1',
              segments: [{ kind: 'text', text: 'Hello' }],
              bullets: [],
            },
          ],
          layers: [
            {
              id: 'layer-background',
              zIndex: -10,
              styles: {},
              components: [
                {
                  id: 'rectangle-0',
                  type: 'Rectangle',
                  props: {
                    color: '#ff0000',
                    x: 0,
                    y: 0,
                    width: 100,
                    height: 100,
                  },
                },
              ],
            },
            {
              id: 'layer-content',
              zIndex: 10,
              styles: { opacity: 0.9 },
              components: [
                {
                  id: 'title-0',
                  type: 'Title',
                  props: {
                    text: 'Test Title',
                    fontSize: 48,
                  },
                },
              ],
            },
          ],
          styles: {},
        },
      ],
      meta: {
        fps: 30,
        width: 1280,
        height: 720,
        durationSeconds: 10,
      },
    };

    const result = dslToScriptData(composition);
    const scenes = result.scenes ?? [];
    const scene = scenes[0];
    const layers = (scene?.layers ?? []) as Array<any>;

    // Check that layers are preserved
    assert.equal(scenes.length, 1);
    assert.equal(layers.length, 2);

    // Check first layer
    const layer1 = layers[0];
    assert.equal(layer1.id, "layer-background");
    assert.equal(layer1.zIndex, -10);
    assert.equal(layer1.components.length, 1);
    assert.equal(layer1.components[0].type, "Rectangle");

    // Check second layer
    const layer2 = layers[1];
    assert.equal(layer2.id, "layer-content");
    assert.equal(layer2.zIndex, 10);
    assert.equal(layer2.styles?.opacity, 0.9);
    assert.equal(layer2.components.length, 1);
    assert.equal(layer2.components[0].type, "Title");
  });

  it('should handle scenes with no layers', () => {
    const composition: CompositionSpec = {
      id: 'test-composition',
      title: 'Test Composition',
      timeline: [
        {
          id: 'scene-1',
          title: 'Scene 1',
          items: [
            {
              kind: 'cue',
              id: 'cue-1',
              label: 'Cue 1',
              segments: [{ kind: 'text', text: 'Hello' }],
              bullets: [],
            },
          ],
          layers: [],
          styles: {},
        },
      ],
      meta: {
        fps: 30,
        width: 1280,
        height: 720,
        durationSeconds: 10,
      },
    };

    const result = dslToScriptData(composition);
    const scenes = result.scenes ?? [];
    const layers = (scenes[0]?.layers ?? []) as Array<any>;

    assert.equal(scenes.length, 1);
    assert.equal(layers.length, 0);
  });
});
