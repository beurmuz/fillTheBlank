"use strict";

const canvas = document.querySelector("#canvas"); // canvasRef
const palette = document.querySelector(".palette");

// canvas의 가로, 세로 사이즈 (실제 컨버스 요소의 크기)
canvas.width = 350;
canvas.height = 350;
const canvasWidth = canvas.width;
const canvasHeight = canvas.height; // canvas의 가로, 세로 사이즈 (실제 canvas 요소의 크기)

// 시작 컬러값
let currentColor = {
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
  const nowColorArr = String(nowColor.match(/(?<=\().+?(?=\))/g)).split(",");
  currentColor = {
    r: Number(nowColorArr[0]),
    g: Number(nowColorArr[1]),
    b: Number(nowColorArr[2]),
  };
  //   console.log(currentColor);
});

// canvas위에 요소를 그리는 함수
// 현재 색칠 상태와 외곽선 이미지를 다시 그려주는 함수 
const redraw = function () {
	// canvas 비우기. 이전 색칠 상태를 다 지운다. 
  clearCanvas();

  // 색칠한 내용 복원하기
  context.putImageData(useColorsData, 0, 0); // 컬러 넣기 시작. 주석 시 색깔이 안채워짐

  context.drawImage(
    onlyLineImage,
    drawStartX,
    drawStartY,
    imageWidth,
    imageHeight
  );
};

// 컨버스에서 마우스 이벤트의 현재 좌푯값 가져오기
let createMouseEvents = () => {
  canvas.addEventListener("mousedown", (e) => {
    let nowX = e.offsetX;
    let nowY = e.offsetY;
    // console.log(nowX, nowY);
    paintAt(nowX, nowY);
  });
};

// 선 구분 함수
const matchOutlineColor = function (r, g, b, a) {
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
  if (r === currentColor.r && g === currentColor.g && b === currentColor.b) {
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

let floodFill = function (startX, startY, startR, startG, startB) {
  let newPos, x, y, pixelPos;
  let reachLeft, reachRight;
  let drawingBoundLeft = drawStartX,
    drawingBoundTop = drawStartY;
  let drawingBoundRight = drawStartX + imageWidth - 1,
    drawingBoundBottom = drawStartY + imageHeight - 1;
  let pixelStack = [[startX, startY]];

  while (pixelStack.length) {
    newPos = pixelStack.pop();
    x = newPos[0];
    y = newPos[1];

    // Get current pixel position
    pixelPos = (y * canvasWidth + x) * 4;

    // Go up as long as the color matches and are inside the canvas
    while (
      y >= drawingBoundTop &&
      matchStartColor(pixelPos, startR, startG, startB)
    ) {
      y -= 1;
      pixelPos -= canvasWidth * 4;
    }

    pixelPos += canvasWidth * 4;
    y += 1;
    reachLeft = false;
    reachRight = false;

    // Go down as long as the color matches and in inside the canvas
    while (
      y <= drawingBoundBottom &&
      matchStartColor(pixelPos, startR, startG, startB)
    ) {
      y += 1;

      colorPixel(pixelPos, currentColor.r, currentColor.g, currentColor.b);

      if (x > drawingBoundLeft) {
        if (matchStartColor(pixelPos - 4, startR, startG, startB)) {
          if (!reachLeft) {
            // Add pixel to stack
            pixelStack.push([x - 1, y]);
            reachLeft = true;
          }
        } else if (reachLeft) {
          reachLeft = false;
        }
      }

      if (x < drawingBoundRight) {
        if (matchStartColor(pixelPos + 4, startR, startG, startB)) {
          if (!reachRight) {
            // 스택에 추가 탐색이 필요한 픽셀 추가하기
            pixelStack.push([x + 1, y]);
            reachRight = true;
          }
        } else if (reachRight) {
          reachRight = false;
        }
      }

      pixelPos += canvasWidth * 4;
    }
  }
};

// startX, startY로 지정된 픽셀부터 페인트 버킷 도구로 페인팅을 시작
let paintAt = function (startX, startY) {
  let pixelPos = (startY * canvasWidth + startX) * 4,
    r = useColorsData.data[pixelPos],
    g = useColorsData.data[pixelPos + 1],
    b = useColorsData.data[pixelPos + 2],
    a = useColorsData.data[pixelPos + 3];

  if (r === currentColor.r && g === currentColor.g && b === currentColor.b) {
    // Return because trying to fill with the same color
    // 같은 색으로 채우려고 하니 반환하기
    return;
  }

  if (matchOutlineColor(r, g, b, a)) {
    // Return because clicked outline
    // 외곽선 클릭으로 인해 반환
    return;
  }

  floodFill(startX, startY, r, g, b);

  redraw();
};

// console.log(canvasWidth, canvasHeight);
// console.log(drawStartX, drawStartY);
