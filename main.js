"use strict";

const canvas = document.querySelector("#canvas"); // canvasRef
const palette = document.querySelector(".palette");

// canvas의 가로, 세로 사이즈 (실제 컨버스 요소의 크기)
canvas.width = 350;
canvas.height = 350;
const canvasWidth = canvas.width;
const canvasHeight = canvas.height; // canvas의 가로, 세로 사이즈 (실제 canvas 요소의 크기)

// 시작 컬러(=사용자가 고른 색, =현재 색)는 이거다!
let pickColor = {
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
let outlineData; // 외곽선 정보를 저장 (구분을 위해 저장)
let useColorsData; // 사용자가 사용한 색상들을 저장

// 그림을 그리기 시작하는 (x, y)좌표
const drawStartX = 0;
const drawStartY = 0;

// ----------------------------------------------------------------------------------
// ✅ canvas에서 2D 그림을 그릴 수 있는 API를 가져오지 못할 경우(canvas 미지원 or 보안 or 버그)
const context = canvas.getContext("2d");
if (!context) alert("Canvas를 이용할 수 없습니다.");

// 🔎 canvas 초기화 함수
// : canvas 요소 생성 -> 이미지 load -> 이벤트 추가
const init = () => {
  onlyLineImage.src = "images/jjanggu.png";
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
      // 처음 외곽선을 그렸을 때, 픽셀 정보를 복사함
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
const clearCanvas = function () {
  context.clearRect(0, 0, canvas.width, canvas.height);
};

// ✅ palette에서 사용자가 클릭한 색상을 현재 컬러로 저장함
palette.addEventListener("click", (e) => {
  const nowColor = e.target.style.backgroundColor;
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
let createMouseEvents = () => {
  canvas.addEventListener("mousedown", (e) => {
    let nowX = e.offsetX;
    let nowY = e.offsetY;
    paintAt(nowX, nowY);
  });
};

// 🔎 onlyLineImage에 있는 외곽선을 감지하는 함수
// - 외곽선은 검정색((0, 0, 0) === (r+g+b < 100))이고, 불투명(알파값이 255)하다.
const matchOutlineColor = (r, g, b, a) => {
  return r + g + b < 100 && a === 255;
};

let matchStartColor = function (pixelPos, startR, startG, startB) {
  let r = outlineData.data[pixelPos],
    g = outlineData.data[pixelPos + 1],
    b = outlineData.data[pixelPos + 2],
    a = outlineData.data[pixelPos + 3];

  // If current pixel of the outline image is black
  if (matchOutlineColor(r, g, b, a)) {
    return false;
  }
  r = useColorsData.data[pixelPos];
  g = useColorsData.data[pixelPos + 1];
  b = useColorsData.data[pixelPos + 2];

  // If the current pixel matches the clicked color
  if (r === startR && g === startG && b === startB) {
    return true;
  }

  // If current pixel matches the new color
  if (r === pickColor.r && g === pickColor.g && b === pickColor.b) {
    return false;
  }

  return true;
};

let colorPixel = function (pixelPos, r, g, b, a) {
  useColorsData.data[pixelPos] = r;
  useColorsData.data[pixelPos + 1] = g;
  useColorsData.data[pixelPos + 2] = b;
  useColorsData.data[pixelPos + 3] = a !== undefined ? a : 255;
};

// 🔎 FloodFill 알고리즘!
// 인자로 (사용자가 클릭한 x, y좌표, 클릭한 픽셀의 기존 색상 R, G, B)를 받는다.
// 이 x,y 자표를 기준으로 같은 색상인 픽셀들을 전부 찾아서 현재 선택된 pickColor로 색칠하는 것이다.
let floodFill = function (startX, startY, startR, startG, startB) {
  let nowPos, pixelPos; // 현재 탐색중인 좌표 [x, y].  &  RGBA 배열의 index 위치. (nowPos를 픽셀 데이터 배열에서 찾기 위해 계산된 숫자)
  let x, y; // 현재 flood fill이 진행중인 좌표
  let canGoLeft, canGoRight; // 좌우로 색칠할 수 있는지 상태를 기억하는 변수 (왼or오로 탐색을 확장할지 여부를 판단 )
  let drawingBoundLeft = drawStartX, // 색칠 가능 범위의 최소 x값 (좌측 경계)
    drawingBoundTop = drawStartY, // 색칠 가능한 범위의 최소 y값 (상단 경계)
    drawingBoundRight = drawStartX + imageWidth - 1, // 색칠 가능 범위의 최대 x값 (오른쪽 경계)
    drawingBoundBottom = drawStartY + imageHeight - 1; // 색칠 가능 범위의 최대 y값 (아래쪽 경계)

  // 탐색해야할 픽셀 목록 (일단 시작 위치를 넣고 시작)
  let pixelStack = [[startX, startY]];

  // 색칠해야할 픽셀이 남아있으면 계속 반복
  while (pixelStack.length) {
    nowPos = pixelStack.pop();
    x = nowPos[0];
    y = nowPos[1];

    // 화면 기준 (x, y)위치를 색칠할건데, 색칠 정보가 useColorData 배열 안에 있어서 몇번째 픽셀 안에 있는지를 알아야 함
    // useColorData는 [R,G,B,A,R,G,B,A,...]이렇게 되어있어서, 현재 canvas의 가로세로 안에서 몇번째 픽셀인지 구하기 위해 배열의 인덱스로 바꿔야 함
    pixelPos = (y * canvasWidth + x) * 4; // [x, y]의 R값이 저장된 위치 index

    // 위로 올라가며 같은 색을 확인
    while (
      y >= drawingBoundTop &&
      matchStartColor(pixelPos, startR, startG, startB)
    ) {
      // 아직 위로 올라갈 수 있고, 색이 같으면 계속 이동
      y--;
      pixelPos -= canvasWidth * 4;
    }

    // 한줄씩 내려가며 색칠
    y++;
    pixelPos += canvasWidth * 4;
    canGoLeft = false;
    canGoRight = false;

    while (
      y <= drawingBoundBottom &&
      matchStartColor(pixelPos, startR, startG, startB)
    ) {
      // 아직 내려갈 수 있고, 색이 같으면 계속 이동
      y++;
      // 픽셀을 현재 선택된 색(pickColor)으로 채움
      colorPixel(pixelPos, pickColor.r, pickColor.g, pickColor.b);

      // 왼쪽도 확장 가능한지 확인
      if (x > drawingBoundLeft) {
        if (matchStartColor(pixelPos - 4, startR, startG, startB)) {
          if (!canGoLeft) {
            pixelStack.push([x - 1, y]);
            canGoLeft = true;
          }
        } else if (canGoLeft) {
          canGoLeft = false;
        }
      }

      // 오른쪽도 확장 가능한지 확인
      if (x < drawingBoundRight) {
        if (matchStartColor(pixelPos + 4, startR, startG, startB)) {
          if (!canGoRight) {
            // 스택에 추가 탐색이 필요한 픽셀 추가하기
            pixelStack.push([x + 1, y]);
            canGoRight = true;
          }
        } else if (canGoRight) {
          canGoRight = false;
        }
      }

      // 다음 픽셀로 이동(한줄 아래로 이동)
      pixelPos += canvasWidth * 4;
    }
  }
};

// 🔎 클릭한 픽셀(startX, startY)부터 현재 선택한 색(pickColor)으로 색칠을 시작하는 함수
let paintAt = function (startX, startY) {
  // 클릭한 좌표를 RGBA 배열에서 해당 픽셀의 위치로 바꾼다. (1pixel당 R, G, B, A로 총 4칸씩 사용되니 *4)
  let pixelPos = (startY * canvasWidth + startX) * 4,
    // useColorsData에는 각 픽셀에 사용자가 색칠한 모든 색 정보가 들어있어, 해당 위치에 어떤 색이 칠해져있는지 확인할 수 있다.
    r = useColorsData.data[pixelPos],
    g = useColorsData.data[pixelPos + 1],
    b = useColorsData.data[pixelPos + 2],
    a = useColorsData.data[pixelPos + 3];

  // 색을 칠하지 않아야 하는 경우 check: 이미 같은색이거나 외곽선인 경우
  if (r === pickColor.r && g === pickColor.g && b === pickColor.b) return;
  if (matchOutlineColor(r, g, b, a)) return;

  // FloodFill 알고리즘으로 색칠 시작! (현재 좌표 정보와 현재 색 정보 넣기)
  floodFill(startX, startY, r, g, b);
  // 색칠 결과가 저장된 useColorsData를 기반으로 캔버스를 갱신해야 함
  redraw();
};

// console.log(canvasWidth, canvasHeight);
// console.log(drawStartX, drawStartY);
