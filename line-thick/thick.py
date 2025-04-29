import cv2
import numpy as np
import os
from matplotlib import pyplot as plt

# 이미지 불러오기
image = cv2.imread('images/sanrio2.jpg', cv2.IMREAD_GRAYSCALE)

# 이진화 -> 선 강조를 위해 반전
_, binary = cv2.threshold(image, 127, 255, cv2.THRESH_BINARY_INV)

# 팽창 연산 -> 선을 굵게 만들기
kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7))
dilated = cv2.dilate(binary, kernel, iterations=1)

# 다시 색 반전 -> 뒤집힌 색을 원래대로
final_result = cv2.bitwise_not(dilated)

# 최종 결과물 저장
os.makedirs('transfer-images', exist_ok=True)
cv2.imwrite('transfer-images/sanrio2.jpg', final_result)

# 출력
plt.imshow(final_result, cmap='gray')
plt.title("굵어진 선 이미지 (최종 색 반전됨)")
plt.axis("off")
plt.show()