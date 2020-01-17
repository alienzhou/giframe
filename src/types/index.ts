export interface IFrameInfo {
    x: number;
    y: number;
    width: number;
    height: number;
    hasLocalPalette: boolean;
    paletteOffset: number;
    paletteSize: number;
    dataOffset: number;
    dataLength: number;
    transparentIndex: number;
    interlaced: boolean;
    delay: number;
    disposal: number;
}

export type BufferArray = Buffer;
