import { describe, expect, it } from 'vitest';
import { DEFAULT_CAMERA } from '../../src/render/camera';
import { useViewStore } from '../../src/ui/store';

describe('stan widoku', () => {
  it('startuje z domyślną kamerą i pozwala ją zmienić', () => {
    expect(useViewStore.getState().camera).toEqual(DEFAULT_CAMERA);
    const camera = { center: { x: 3, y: -2 }, pixelsPerMeter: 40 };
    useViewStore.getState().setCamera(camera);
    expect(useViewStore.getState().camera).toEqual(camera);
    useViewStore.getState().setCamera(DEFAULT_CAMERA);
  });
});
