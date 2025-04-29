// 이미지 데이터 타입
export type CanvasImageData = ImageData;

// 색상 타입
export interface RGBColor {
  r: number;
  g: number;
  b: number;
  a?: number;
}

// 좌표 타입
export interface ClickPosition {
  x: number;
  y: number;
}

// FloodFill 인자 타입 설정
export interface FloodFillStartPosInfo {
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
}
