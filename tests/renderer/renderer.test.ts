/**
 * tests/renderer/renderer.test.ts
 *
 * Tests for GameRenderer lifecycle.
 * T010: init/destroy lifecycle tests.
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GameRenderer } from '../../src/renderer/renderer';

// ---------------------------------------------------------------------------
// Three.js mock — GameRenderer tests run in happy-dom (no WebGL context)
// ---------------------------------------------------------------------------

vi.mock('three', async () => {
  const actual = await vi.importActual<typeof import('three')>('three');

  // Minimal canvas mock for WebGLRenderer
  const createMockCanvas = () => {
    const canvas = document.createElement('canvas');
    Object.defineProperty(canvas, 'clientWidth', { get: () => 800, configurable: true });
    Object.defineProperty(canvas, 'clientHeight', { get: () => 600, configurable: true });
    return canvas;
  };

  const MockWebGLRenderer = vi.fn().mockImplementation(() => {
    const dom = createMockCanvas();
    return {
      domElement: dom,
      setPixelRatio: vi.fn(),
      setSize: vi.fn(),
      render: vi.fn(),
      dispose: vi.fn(),
    };
  });

  return {
    ...actual,
    WebGLRenderer: MockWebGLRenderer,
  };
});

// ---------------------------------------------------------------------------
// T010: GameRenderer lifecycle
// ---------------------------------------------------------------------------

describe('GameRenderer lifecycle', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', { get: () => 800, configurable: true });
    Object.defineProperty(container, 'clientHeight', { get: () => 600, configurable: true });
    document.body.appendChild(container);

    // Stub canvas.getContext to return non-null so WebGL check passes
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as never);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('init() resolves without throwing', async () => {
    const renderer = new GameRenderer();
    await expect(renderer.init(container)).resolves.not.toThrow();
    renderer.destroy();
  });

  it('destroy() cleans up without throwing', async () => {
    const renderer = new GameRenderer();
    await renderer.init(container);
    expect(() => renderer.destroy()).not.toThrow();
  });

  it('canvas element is appended to container during init', async () => {
    const renderer = new GameRenderer();
    expect(container.querySelector('canvas')).toBeNull();
    await renderer.init(container);
    expect(container.querySelector('canvas')).not.toBeNull();
    renderer.destroy();
  });

  it('canvas element is removed on destroy', async () => {
    const renderer = new GameRenderer();
    await renderer.init(container);
    expect(container.querySelector('canvas')).not.toBeNull();
    renderer.destroy();
    expect(container.querySelector('canvas')).toBeNull();
  });
});
