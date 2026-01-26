import { describe, it, expect } from '@jest/globals';
import { dslToScriptData } from '../dsl-to-script.js';
import type { CompositionSpec } from 'babulus/dsl';

describe('dslToScriptData', () => {
  it('should preserve layers from CompositionSpec', () => {
    const composition: CompositionSpec = {
      id: 'test-composition',
      title: 'Test Composition',
      scenes: [
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
    expect(scenes).toHaveLength(1);
    expect(layers).toHaveLength(2);

    // Check first layer
    const layer1 = layers[0];
    expect(layer1.id).toBe('layer-background');
    expect(layer1.zIndex).toBe(-10);
    expect(layer1.components).toHaveLength(1);
    expect(layer1.components![0].type).toBe('Rectangle');

    // Check second layer
    const layer2 = layers[1];
    expect(layer2.id).toBe('layer-content');
    expect(layer2.zIndex).toBe(10);
    expect(layer2.styles?.opacity).toBe(0.9);
    expect(layer2.components).toHaveLength(1);
    expect(layer2.components![0].type).toBe('Title');
  });

  it('should handle scenes with no layers', () => {
    const composition: CompositionSpec = {
      id: 'test-composition',
      title: 'Test Composition',
      scenes: [
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

    expect(scenes).toHaveLength(1);
    expect(layers).toHaveLength(0);
  });
});
