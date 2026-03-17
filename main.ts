"use strict";

import { CanvasImageData, RGBColor, ClickPosition } from "./types";

const canvas = document.querySelector("#canvas") as HTMLCanvasElement; // canvasRef
const palette = document.querySelector(".palette") as HTMLDivElement;

// canvas의 가로, 세로 사이즈 (실제 컨버스 요소의 크기)
canvas.width = 350;
canvas.height = 350;
const canvasWidth = canvas.width;
const canvasHeight = canvas.height; // canvas의 가로, 세로 사이즈 (실제 canvas 요소의 크기)

// 시작 컬러(=사용자가 고른 색, =현재 색)는 이거다!
let pickColor: RGBColor = {
  r: 255,
  g: 255,
  b: 234,
};

// 선만 있는 이미지 가져오기
// 순서대로 이미지의 가로, 세로, 색상 객체들(RGBA)
const onlyLineImage = new Image();
const imageWidth = canvas.width;
const imageHeight = canvas.height;

// 두 변수는 canvas위에 있는 모든 픽셀의 색상 정보(R, G, B, A)를 4byte씩 담고 있음
// 총 배열의 길이는 490000. 그 이유는 전체 픽셀수가 350*350=122500이고, 1개의 픽셀 당 4개의 값이 필요해서 122500*4가 되는 것
let outlineData: CanvasImageData; // 외곽선 정보를 저장 (구분을 위해 저장)
let useColorsData: CanvasImageData; // 사용자가 사용한 색상들을 저장

// 그림을 그리기 시작하는 (x, y)좌표
const drawStartX = 0;
const drawStartY = 0;

// ----------------------------------------------------------------------------------
// ✅ canvas에서 2D 그림을 그릴 수 있는 API를 가져오지 못할 경우(canvas 미지원 or 보안 or 버그)
const context = canvas.getContext("2d", {
  willReadFrequently: true,
}) as CanvasRenderingContext2D; // 2D context
if (!context) alert("Canvas를 이용할 수 없습니다.");

// 🔎 canvas 초기화 함수
// : canvas 요소 생성 -> 이미지 load -> 이벤트 추가
const init = () => {
  // onlyLineImage.src = "images/jjanggu.png";
  onlyLineImage.src = "images/kitty.png";
  onlyLineImage.onload = () => {
    context.drawImage(
      onlyLineImage,
      drawStartX,
      drawStartY,
      imageWidth,
      imageHeight
    );

    // file에서 열었거나 CORS 설정이 안되어있는 경우 에러 처리를 해주어야 함
    try {
      // 처음 외곽선을 그렸을 때, 픽셀 정보를 복사
      // (0, 0) ~ (canvasWidth, canvasHeight) 범위 안에 있는 모든 픽셀의 R, G, B, A를 하나하나 다 가져오는 것
      // (즉, getImageData로 canvas에 있는 전체 픽셀 정보를 전부 가져오는 것이다!)
      outlineData = context.getImageData(0, 0, canvasWidth, canvasHeight); // (x, y, 너비, 높이)
    } catch (error) {
      alert("서버에서 실행해주세요.");
      return;
    }

    clearCanvas(); // canvas 초기화
    useColorsData = context.getImageData(0, 0, canvasWidth, canvasHeight); // 각 픽셀에 대한 imageData 객체의 (R, G, B, A) 받아오기
    createMouseEvents();
    redraw();
    // console.log("outlineData: ", outlineData);
    // console.log("useColorsData: ", useColorsData);
  };
};

// 🔎 canvas 내부의 모든 픽셀 (x, y)~(width, height) (= 전체 영역)을 지우는 함수
const clearCanvas = function (): void {
  context.clearRect(0, 0, canvas.width, canvas.height);
};

// ✅ palette에서 사용자가 클릭한 색상을 현재 컬러로 저장함
palette.addEventListener("click", (e: MouseEvent) => {
  const target = e.target as HTMLElement; // EventTarget 타입에는 style 속성이 없어서, style에 접근하려면 HTMLElement임을 명확히 명시해야 함
  const nowColor = target.style.backgroundColor;
  // rgb(255, 255, 255)에서 괄호를 제외하고 ','를 기준으로 나누어 숫자만 뽑아냄 -> ['255', '255', '255']
  const colorList = String(nowColor.match(/(?<=\().+?(?=\))/g)).split(",");
  pickColor = {
    r: Number(colorList[0]),
    g: Number(colorList[1]),
    b: Number(colorList[2]),
  };
  //   console.log(pickColor);
});

// 🔎 canvas위에 요소를 그리는 함수
// : 현재까지 색칠한 상태와 외곽선을 항상 정확하게 화면에 렌더링해주는 갱신 함수 (상태가 바뀔떄마다 항상 갱신해야함)
const redraw = function () {
  // 이전 그림을 다 지우기 (= canvas 비우기) -> 색이 칠해진 곳에 덧칠하면 제대로 색칠되지 않는 문제 발생
  clearCanvas();

  // 사용자가 색칠한 데이터를 픽셀 단위로 캔버스에 다시 그림
  context.putImageData(useColorsData, 0, 0); // (복원할 픽셀 데이터, 그릴 위치의 x좌표, y좌표)
  // 색칠 후 외곽선 이미지를 다시 덮어씌움 (선을 항상 제일 위에 보이게 하는 역할)
  context.drawImage(
    onlyLineImage,
    drawStartX,
    drawStartY,
    imageWidth,
    imageHeight
  );
};

// 🔎 클릭한 위치를 기준으로 색칠을 시작하게 하는 함수
let createMouseEvents = (): void => {
  canvas.addEventListener("mousedown", (e: MouseEvent) => {
    const pos: ClickPosition = {
      x: e.offsetX,
      y: e.offsetY,
    };
    paintAt(pos);
  });
};

// 🔎 onlyLineImage에 있는 외곽선을 감지하는 함수
// - 외곽선은 검정색((0, 0, 0) === (r+g+b < 100))이고, 불투명(알파값이 255)하다.
const matchOutlineColor = (
  r: number,
  g: number,
  b: number,
  a: number
): boolean => {
  return r + g + b < 100 && a === 255;
};

// 🔎 pixelPos 위치의 픽셀을 칠할 수 있는지 아닌지 판단하는 함수
let matchStartColor = function (
  pixelPos: number,
  startColor: RGBColor
): boolean {
  // 외곽선 색 정보 가져오기
  let r = outlineData.data[pixelPos];
  let g = outlineData.data[pixelPos + 1];
  let b = outlineData.data[pixelPos + 2];
  let a = outlineData.data[pixelPos + 3];

  // 현재 pixelPos가 외곽선(검정색)이면 색칠하지 않고 false를 바로 반환
  if (matchOutlineColor(r, g, b, a)) {
    return false;
  }

  // 실제로 사용자가 색칠한 정보 읽어오기
  r = useColorsData.data[pixelPos];
  g = useColorsData.data[pixelPos + 1];
  b = useColorsData.data[pixelPos + 2];

  // 현재 픽셀이 처음 클릭한 색과 같다면(같은 색끼리는 이어서 색칠해야 함) true 반환!
  if (r === startColor.r && g === startColor.g && b === startColor.b) {
    return true;
  }

  // 현재 픽셀이 이미 새로 칠한 색이면(또 칠할 필요 없음) false 반환
  if (r === pickColor.r && g === pickColor.g && b === pickColor.b) {
    return false;
  }

  // 나머지는 색칠 가능한 픽셀이므로 true 반환
  return true;
};

// 🔎 floodFill 과정 중, pixelPos 위치의 픽셀을 색칠하는 함수
let colorPixel = function (
  pixelPos: number,
  r: number,
  g: number,
  b: number,
  a?: number
): void {
  useColorsData.data[pixelPos] = r;
  useColorsData.data[pixelPos + 1] = g;
  useColorsData.data[pixelPos + 2] = b;
  useColorsData.data[pixelPos + 3] = a !== undefined ? a : 255;
};

// 🔎 FloodFill 함수 (알고리즘)
// 인자로 (사용자가 클릭한 x, y좌표, 클릭한 픽셀의 기존 색상 R, G, B)를 받는다.
// 이 x,y 좌표를 기준으로 같은 색상인 픽셀들을 전부 찾아서 현재 선택된 pickColor로 색칠하는 것이다.
// 시작 좌표에서부터 같은 색으로 연결된 영역을 맨 위에서부터 아래로 내려가며 좌우까지 탐색하면서 전부 현재 선택된 색으로 색칠
let floodFill = function (
  startX: number,
  startY: number,
  startR: number,
  startG: number,
  startB: number
): void {
  let nowPos, pixelPos; // 현재 탐색중인 좌표 [x, y].  &  RGBA 배열의 index 위치. (nowPos를 픽셀 데이터 배열(RGBA)에서 찾기 위해 계산된 숫자)
  let x, y; // 현재 flood fill이 진행중인 좌표
  let canGoLeft, canGoRight; // 좌우로 색칠할 수 있는지 상태를 기억하는 변수 (왼or오로 탐색을 확장할지 여부를 판단 )
  let drawingBoundLeft = drawStartX, // 색칠 가능 범위의 최소 x값 (좌측 경계)
    drawingBoundTop = drawStartY, // 색칠 가능한 범위의 최소 y값 (상단 경계)
    drawingBoundRight = drawStartX + imageWidth - 1, // 색칠 가능 범위의 최대 x값 (오른쪽 경계)
    drawingBoundBottom = drawStartY + imageHeight - 1; // 색칠 가능 범위의 최대 y값 (아래쪽 경계)

  // 색칠할 예정인 좌표들을 stack에 넣는다.
  let pixelStack = [[startX, startY]];

  while (pixelStack.length) {
    nowPos = pixelStack.pop()!; // 반드시 값이 있음을 확신함
    // 색칠할 좌표 하나 빼기
    x = nowPos[0];
    y = nowPos[1];

    // 화면 기준 (x, y)위치를 색칠할건데, 색칠 정보는 RGBA(1차원) 배열 안에 있으니, 2차원 좌표인 (x,y)를 1차원 인덱스로 바꾸어야 함
    pixelPos = (y * canvasWidth + x) * 4; // R,G,B,A이나 *4를 해서 [x, y]의 R값이 저장된 위치 index를 구할 것

    // 🎤 FloodFill은 현재 픽셀이 포함된 줄을 기준으로 쭉 위로 가면서 같은 색이 이어지는지를 먼저 확인해야 함.
    // -> 그래야 정확하게 채울 시작점을 찾을 수 있음
    // 위로 올라가며 같은 색을 확인
    while (
      y >= drawingBoundTop &&
      matchStartColor(pixelPos, { r: startR, g: startG, b: startB })
    ) {
      // 한 줄씩 위로 올라가면서 pixelPos로 위로 이동해준다. (이때 한 줄은 canvasWidth만큼임)
      y--; // y도 위로 한줄 이동
      pixelPos -= canvasWidth * 4; // pixelPos로 위로 이동
    }

    // 위에서 정확하게 채울 시작점을 찾았으므로, 한줄씩 내려가며 같은 색인 픽셀들을 "색칠"
    // y가 -경계에 있으므로 y+1, pixelPos + 1줄을 해준다.
    y++;
    pixelPos += canvasWidth * 4;
    canGoLeft = false; // 좌우로 퍼질 준비
    canGoRight = false;
    while (
      y <= drawingBoundBottom &&
      matchStartColor(pixelPos, { r: startR, g: startG, b: startB })
    ) {
      y++;
      // 픽셀을 현재 선택된 색(pickColor)으로 채움
      colorPixel(pixelPos, pickColor.r, pickColor.g, pickColor.b);

      // 내려오면서 매 줄마다 양 옆으로 확장 가능한지 확인
      if (x > drawingBoundLeft) {
        // 왼쪽 픽셀도 같은 색이면
        if (
          matchStartColor(pixelPos - 4, { r: startR, g: startG, b: startB })
        ) {
          if (!canGoLeft) {
            // canGoLeft로 중복 추가(방문) 방지.
            // 다음에 탐색할 후보로 스택에 추가
            pixelStack.push([x - 1, y]);
            canGoLeft = true;
          }
        } else if (canGoLeft) {
          canGoLeft = false;
        }
      }

      // 오른쪽
      if (x < drawingBoundRight) {
        if (
          matchStartColor(pixelPos + 4, { r: startR, g: startG, b: startB })
        ) {
          if (!canGoRight) {
            pixelStack.push([x + 1, y]);
            canGoRight = true;
          }
        } else if (canGoRight) {
          canGoRight = false;
        }
      }

      // 다음 픽셀로 이동(한줄 아래로 이동하기 위해 index를 다음 행으로 이동)
      pixelPos += canvasWidth * 4;
    }
  }
};

// 🔎 클릭한 픽셀(startX, startY)부터 현재 선택한 색(pickColor)으로 색칠을 시작하는 함수
let paintAt = (pos: ClickPosition): void => {
  // 클릭한 좌표를 RGBA 배열에서 해당 픽셀의 위치로 바꾼다. (1pixel당 R, G, B, A로 총 4칸씩 사용되니 *4)
  let { x, y } = pos;
  let pixelPos = (y * canvasWidth + x) * 4,
    // useColorsData에는 각 픽셀에 사용자가 색칠한 모든 색 정보가 들어있어, 해당 위치에 어떤 색이 칠해져있는지 확인할 수 있다.
    r = useColorsData.data[pixelPos],
    g = useColorsData.data[pixelPos + 1],
    b = useColorsData.data[pixelPos + 2],
    a = useColorsData.data[pixelPos + 3];

  // 색을 칠하지 않아야 하는 경우 check: 이미 같은색이거나 외곽선인 경우
  if (r === pickColor.r && g === pickColor.g && b === pickColor.b) return;
  if (matchOutlineColor(r, g, b, a)) return;

  // FloodFill 알고리즘으로 색칠 시작! (현재 좌표 정보와 현재 색 정보 넣기)
  floodFill(x, y, r, g, b);
  // 색칠 결과가 저장된 useColorsData를 기반으로 canvas를 갱신 (실제 canvas에 한 번에 반영)
  redraw();
};

// console.log(canvasWidth, canvasHeight);
// console.log(drawStartX, drawStartY);

// ✅ 결과물을 저장하는 로직
const saveButton = document.querySelector("#saveButton") as HTMLButtonElement;
saveButton.addEventListener("click", () => {
  // 1. canvas 내용을 데이터 URL로 변환
  const imageData = canvas.toDataURL("image/png");
  const downloadLink = document.createElement("a");
  downloadLink.href = imageData;
  downloadLink.download = "result.png";
  downloadLink.click();
});

// DOM 파싱이 완전히 준비된 후에 JavaScript를 실행한다.
window.addEventListener("DOMContentLoaded", () => {
  init();
});
