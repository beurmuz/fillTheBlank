'use strict';

let curColor = {
	r: 255,
	g: 255,
	b: 65
};

const palette = document.querySelector('.controls__colors');
palette.addEventListener(('click'), (e) => {
	const nowColor = e.target.style.backgroundColor;
	const nowColorArr = String(nowColor.match(/(?<=\().+?(?=\))/g)).split(',');

	curColor = {
		r: +nowColorArr[0],
		g: +nowColorArr[1],
		b: +nowColorArr[2]
	}
});

let paintBucketApp = (function () {
	let context,
		canvasWidth = 490,
		canvasHeight = 220,
		
		outlineImage = new Image(), // 누끼 이미지 (선만 딴거)
		backgroundImage = new Image(), // 빈 png 

		drawingAreaX = 111, // 이건 머니?????? 그림 그리는 영역의 X좌표?
		drawingAreaY = 11, // 얘는 또 머니???? 그림 그리는 영역의 y좌표???
		drawingAreaWidth = 267, // watermelon-duck 이미지의 가로 크기
		drawingAreaHeight = 200, // watermelon-duck 이미지의 세로 크기 
		colorLayerData, // RGBA의 값을 가진 객체 
		outlineLayerData, // RGBA의 값을 가진 객체
		totalLoadResources = 2, // 총 로드해야할 리소스(이미지) 개수는 3
		curLoadResNum = 0, // 로드된 이미지 수 카운트 

		// Clears the canvas.
		clearCanvas = function () {

			context.clearRect(0, 0, context.canvas.width, context.canvas.height);
		},

		// Draw the elements on the canvas
		redraw = function () {

			// Make sure required resources are loaded before redrawing 다시 그리기 전에 필요한 리소스가 모두 로드 되었는지 확인하기
			if (curLoadResNum < totalLoadResources) { // 
				return;
			}

			clearCanvas();

			// Draw the current state of the color layer to the canvas
			context.putImageData(colorLayerData, 0, 0); // 컬러 넣기 시작. 주석 시 색깔이 안채워짐

			// Draw the background
			context.drawImage(backgroundImage, 0, 0, canvasWidth, canvasHeight); // background 이미지 그리기

			// Draw the outline image on top of everything. We could move this to a separate 
			//   canvas so we did not have to redraw this everyime.
			context.drawImage(outlineImage, drawingAreaX, drawingAreaY, drawingAreaWidth, drawingAreaHeight); // watermelon 이미지 그리기
		},


		// 여기부터 색칠 코드 

		matchOutlineColor = function (r, g, b, a) {

			return (r + g + b < 100 && a === 255);
		},

		matchStartColor = function (pixelPos, startR, startG, startB) {

			let r = outlineLayerData.data[pixelPos],
				g = outlineLayerData.data[pixelPos + 1],
				b = outlineLayerData.data[pixelPos + 2],
				a = outlineLayerData.data[pixelPos + 3];

			// If current pixel of the outline image is black
			if (matchOutlineColor(r, g, b, a)) {
				return false;
			}

			r = colorLayerData.data[pixelPos];
			g = colorLayerData.data[pixelPos + 1];
			b = colorLayerData.data[pixelPos + 2];

			// If the current pixel matches the clicked color
			if (r === startR && g === startG && b === startB) {
				return true;
			}

			// If current pixel matches the new color
			if (r === curColor.r && g === curColor.g && b === curColor.b) {
				return false;
			}

			return true;
		},

		colorPixel = function (pixelPos, r, g, b, a) {

			colorLayerData.data[pixelPos] = r;
			colorLayerData.data[pixelPos + 1] = g;
			colorLayerData.data[pixelPos + 2] = b;
			colorLayerData.data[pixelPos + 3] = a !== undefined ? a : 255;
		},

		floodFill = function (startX, startY, startR, startG, startB) {

			let newPos,
				x,
				y,
				pixelPos,
				reachLeft,
				reachRight,
				drawingBoundLeft = drawingAreaX,
				drawingBoundTop = drawingAreaY,
				drawingBoundRight = drawingAreaX + drawingAreaWidth - 1,
				drawingBoundBottom = drawingAreaY + drawingAreaHeight - 1,
				pixelStack = [[startX, startY]];

			while (pixelStack.length) {

				newPos = pixelStack.pop();
				x = newPos[0];
				y = newPos[1];

				// Get current pixel position
				pixelPos = (y * canvasWidth + x) * 4;

				// Go up as long as the color matches and are inside the canvas
				while (y >= drawingBoundTop && matchStartColor(pixelPos, startR, startG, startB)) {
					y -= 1;
					pixelPos -= canvasWidth * 4;
				}

				pixelPos += canvasWidth * 4;
				y += 1;
				reachLeft = false;
				reachRight = false;

				// Go down as long as the color matches and in inside the canvas
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
						} else if (reachRight) {
							reachRight = false;
						}
					}

					pixelPos += canvasWidth * 4;
				}
			}
		},

		// startX, startY로 지정된 픽셀부터 페인트 버킷 도구로 페인팅을 시작
		paintAt = function (startX, startY) {

			let pixelPos = (startY * canvasWidth + startX) * 4,
				r = colorLayerData.data[pixelPos],
				g = colorLayerData.data[pixelPos + 1],
				b = colorLayerData.data[pixelPos + 2],
				a = colorLayerData.data[pixelPos + 3];

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
		},

		// Add mouse event listeners to the canvas
		createMouseEvents = function () {


			$('#canvas').mousedown(function (e) {
				// Mouse down location
				let mouseX = e.pageX - this.offsetLeft,
					mouseY = e.pageY - this.offsetTop;

				// console.log(mouseX, mouseY);
				paintAt(mouseX, mouseY); // 마우스가 클릭되었을 때, 색칠하는 함수 실행
			});
		},

		// 필요한 리소스가 모두 로드된 후 다시 그리기 기능을 호출함
		resourceLoaded = function () {

			curLoadResNum += 1;
			if (curLoadResNum === totalLoadResources) {
				createMouseEvents();
				redraw();
			}
		},

		// Creates a canvas element, loads images, adds events, and draws the canvas for the first time.
		// 컨버스 요소를 만들고, 이미지 로드하고, 이벤트 추가하고, 처음으로 컨버스를 그림
		init = function () {

			// Create the canvas (Neccessary for IE because it doesn't know what a canvas element is)
			// 컨버스 만들기 (컨버스 요소가 무엇인지 모르기 때문에 IE가 필요함)
			let canvas = document.createElement('canvas');
			canvas.setAttribute('width', canvasWidth);
			canvas.setAttribute('height', canvasHeight);
			canvas.setAttribute('id', 'canvas');
			document.getElementById('canvasDiv').appendChild(canvas);

			context = canvas.getContext("2d"); // Grab the 2d canvas context
			// Note: The above code is a workaround for IE 8 and lower. Otherwise we could have used:
			//     context = document.getElementById('canvas').getContext("2d");

			// Load images
			backgroundImage.onload = resourceLoaded; // 이미지 로딩 후 렌더링하기 
			backgroundImage.src = "images/background.png";

			outlineImage.onload = function () {
				context.drawImage(outlineImage, drawingAreaX, drawingAreaY, drawingAreaWidth, drawingAreaHeight);

				// Test for cross origin security error (SECURITY_ERR: DOM Exception 18)
				try {
					outlineLayerData = context.getImageData(0, 0, canvasWidth, canvasHeight); // x, y(위치)와 너비, 높이(치수)
				} catch (ex) {
					window.alert("Application cannot be run locally. Please run on a server.");
					return;
				}
				clearCanvas();
				colorLayerData = context.getImageData(0, 0, canvasWidth, canvasHeight); // 각 픽셀에 대한 객체 imageData의 정보를 받아옴 (R,G,B,A) 값을 받아온다
				// 인자는 x, y, width, height
				resourceLoaded();
			};
			outlineImage.src = "images/watermelon-duck-outline.png";
		};

	return {
		init: init
	};
}());