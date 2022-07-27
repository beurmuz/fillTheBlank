'use strict';

const palette = document.querySelector('.controls__colors');
const canvas = document.querySelector('#canvas');

// 기본 컬러 값 
let curColor = {
	r: 255,
	g: 255,
	b: 234
};

// 변수 선언
const canvasWidth = canvas.width, canvasHeight = canvas.height; // 캔버스 가로, 세로 사이즈는 실제 캔버스 요소의 크기 받아오기
const outlineImage = new Image(), backgroundImage = new Image(); // 이미지 함수 선언
const drawingAreaX = 0, drawingAreaY = 0; // 그림 그리기 시작 좌표(0, 0)
const drawingAreaWidth = canvas.width, drawingAreaHeight = canvas.height; // 색칠할 이미지의 가로, 세로 🤯🤯🤯🤯
let	colorData, outlineData; // RGBA의 값을 가진 객체들
let totalLoadResources = 2, curLoadResNum = 0; // 총 로드해야할 이미지 소스 개수, 로드된 이미지 수를 카운트 할 변수  

// canvas요소는 getContext() 메서드로 랜더링 컨텍스트와 (렌더링 컨텍스트의) 그리기 함수들을 사용할 수 있음
const context = canvas.getContext("2d");
if (!context) {
	alert('This feature is not available in this browser.😥');
}

// 컨버스 초기화: 컨버스 요소 생성, 이미지 로드, 이벤트 추가
const init = () => {
	// 배경 로드
	backgroundImage.src = "images/background.png";
	backgroundImage.onload = resourceLoaded; // 이미지 로딩 후 렌더링하기 

	// 누끼 이미지 로드
	outlineImage.src = "images/watermelon-duck-outline.png";
	outlineImage.onload = () => {
		context.drawImage(outlineImage, drawingAreaX, drawingAreaY, drawingAreaWidth, drawingAreaHeight);

		// Test for cross origin security error (SECURITY_ERR: DOM Exception 18)
		try {
			// getImageData로 컨버스에 그려진 이미지 픽셀정보 얻기
			outlineData = context.getImageData(0, 0, canvasWidth, canvasHeight); // x, y(위치)와 너비, 높이(치수)
		} catch (error) {
			window.alert("Application cannot be run locally. Please run on a server.");
			return;
		}

		clearCanvas(); // 컨버스 초기화
		colorData = context.getImageData(0, 0, canvasWidth, canvasHeight); // 각 픽셀에 대한 imageData 객체의 (R,G,B,A) 값을 받아옴
		resourceLoaded();
	};
};

// 팔레트 클릭 시 해당 색상이 현재 컬러 curColor에 저장됨
palette.addEventListener(('click'), (e) => {
	const nowColor = e.target.style.backgroundColor;
	const nowColorArr = String(nowColor.match(/(?<=\().+?(?=\))/g)).split(',');
	curColor = {
		r: +nowColorArr[0],
		g: +nowColorArr[1],
		b: +nowColorArr[2]
	}
});

// 컨버스를 내부를 지우는 함수
const clearCanvas = function () {
	context.clearRect(0, 0, canvas.width, canvas.height); // x, y, width, height
};

// 컨버스 위에 요소를 그리는 함수
const redraw = function () {
	// 다시 그리기 전에 필요한 리소스가 모두 로드 되었는지 확인하기
	if (curLoadResNum < totalLoadResources) { 
		return;
	}
	clearCanvas();

	// 컨버스에 현재 상태의 색상 그려넣기
	// putImageData는 imgData 전체를 x,y 위치에 써 넣음. imgData 자체에 폭, 높이에 대한 정보가 있으니 좌표만 전달하면 됨
	context.putImageData(colorData, 0, 0); // 컬러 넣기 시작. 주석 시 색깔이 안채워짐

	// drawImage는 컨버스에서 이미지를 그려줌 - new Image로 객체 생성 후, onload로 이미지를 로딩한 후에 컨버스에서 이미지를 그릴 수 있음
	context.drawImage(backgroundImage, 0, 0, canvasWidth, canvasHeight); // 이미지 객체, x, y좌표, 컨버스 위에 그려질 이미지의 넓이, 높이
	context.drawImage(outlineImage, drawingAreaX, drawingAreaY, drawingAreaWidth, drawingAreaHeight); // watermelon 이미지 그리기
};

// 컨버스에서 마우스 이벤트의 현재 좌푯값 가져오기
let createMouseEvents = () => {
	canvas.addEventListener('mousedown', (e) => {
		let nowX = e.clientX;
		let nowY = e.clientY; // 스크롤 시 상대적인 위치를 가짐
		console.log(nowX, nowY);
		paintAt(nowX, nowY);
	});
};

// 필요한 리소스가 모두 로드된 후 다시 그리기 기능을 호출함
const resourceLoaded = function () {
	curLoadResNum += 1;
	if (curLoadResNum === totalLoadResources) { // 제대로 리소스된 경우
		createMouseEvents();
		redraw();
	}
};

// 선 구분 함수
const matchOutlineColor = function(r, g, b, a) {
	return (r + g + b < 100 && a === 255);
}

// console.log(outlineData.data[0]);먼데 
const matchStartColor = function(pixelPos, startR, startG, startB) {
	let r = outlineData.data[pixelPos],
		g = outlineData.data[pixelPos + 1],
		b = outlineData.data[pixelPos + 2],
		a = outlineData.data[pixelPos + 3];

	if(matchOutlineColor(r, g, b, a)) {
		return false;
	}

	r = colorData.data[pixelPos];
	g = colorData.data[pixelPos + 1];
	b = colorData.data[pixelPos + 2];

	if(r === startR && g === startG && b === startB) return true; // 현재 픽셀 값이 클릭한 색과 일치하면
	if(r === curColor && g === curColor.g && b === curColor.b) return false; // 현재 픽셀 값이 새로운 색과 일치하면

	return true;
}

const colorPixel = function (pixelPos, r, g, b, a) {
	colorData.data[pixelPos] = r;
	colorData.data[pixelPos + 1] = g;
	colorData.data[pixelPos + 2] = b;
	colorData.data[pixelPos + 3] = a !== undefined ? a : 255;
};

// 돌아가면서 모든 칸 채우기
const floodFill = function (startX, startY, startR, startG, startB) {
	let nextPos, x, y, pixelPos;
	let reachLeft, reachRight;
	let drawingBoundLeft = drawingAreaX, drawingBoundTop = drawingAreaY;
	let drawingBoundRight = drawingAreaX + drawingAreaWidth - 1, drawingBoundBottom = drawingAreaY + drawingAreaHeight - 1;
	let pixelStack = [[startX, startY]];

	while(pixelStack.length) {
		nextPos = pixelStack.pop();
		x = nextPos[0];
		y = nextPos[1];

		// 현재 픽셀의 위치얻기
		pixelPos = (y * canvasWidth + x) * 4; // (세로 x 컨버스 가로크기 + 가로) * 4

		// 색상이 일치하고 컨버스 안에 있으면 위로 이동
		while(drawingBoundTop <= y && matchStartColor(pixelPos, startR, startG, startB)) {
			y = y - 1;
			pixelPos = pixelPos - (canvasWidth * 4);
		}

		pixelPos += canvasWidth * 4;
		y += 1;
		reachLeft = false;
		reachRight = false;

		// 색이 일치할 때까지 아래로 내려가서 캔버스 안으로 들어가기
		while (y <= drawingBoundBottom && matchStartColor(pixelPos, startR, startG, startB)) {
			y += 1;

			colorPixel(pixelPos, curColor.r, curColor.g, curColor.b);

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
						// Add pixel to stack
						pixelStack.push([x + 1, y]);
						reachRight = true;
					}
				} else if (reachRight) reachRight = false;
			}
			pixelPos += canvasWidth * 4;
		}
	}
}

// startX, startY로 지정된 픽셀부터 페인트 버킷 도구로 페인팅을 시작
let paintAt = function (startX, startY) {

	let pixelPos = (startY * canvasWidth + startX) * 4,
		r = colorData.data[pixelPos],
		g = colorData.data[pixelPos + 1],
		b = colorData.data[pixelPos + 2],
		a = colorData.data[pixelPos + 3];

	if (r === curColor.r && g === curColor.g && b === curColor.b) {
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
