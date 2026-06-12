# FactBite 💡🍿

매일 새로운 지식을 한입 크기로 즐기는 프리미엄 웹 서비스 **FactBite**입니다. 

---

## 🌟 주요 특징 (Features)

- **1,000개의 풍부한 상식 데이터셋**: 엄선되고 정교하게 정제된 1,000개의 유익한 상식들을 포함하고 있습니다.
- **감각적인 프리미엄 디자인**: 다이내믹한 오로라 배경 백그라운드(Glassmorphism)와 부드러운 트랜지션 애니메이션을 제공합니다.
- **상세 설명 확장 (Detail)**: 요약본 하단의 `자세히` 버튼을 누르면 사실에 대한 상세한 맥락과 근거를 펼쳐 볼 수 있습니다.
- **키보드 단축키 지원**:
  - `←` / `→` (왼쪽/오른쪽 화살표): 이전 카드 / 다음 카드로 이동
  - `↓` / `Enter` (아래쪽 화살표 / 엔터): 자세히 보기(접기/펼치기) 토글

---

## 🛠 사용 기술 (Tech Stack)

- **Frontend**: HTML5, Vanilla CSS, JavaScript (ES6+)
- **Design System**: HSL 맞춤형 컬러 팔레트, 글래스모피즘(Glassmorphic Grid Card) 디자인

---

## 🚀 로컬 실행 방법 (Local Run)

별도의 의존성(Dependency) 설치 없이, 브라우저에서 바로 실행하거나 간단한 로컬 웹 서버를 띄워 테스트할 수 있습니다.

```bash
# 1. 저장소 클론 및 폴더 이동
cd FactBite

# 2. 로컬 파이썬 웹 서버 실행
python3 -m http.server 8080
```
이후 브라우저에서 `http://localhost:8080`에 접속하여 실행할 수 있습니다.

---

## 🌐 배포 방법 (Deployment)

FactBite는 정적 파일로만 구성되어 있어 **Vercel**을 통해 1초 만에 무료 배포가 가능합니다.

```bash
# Vercel CLI를 이용한 배포
npx vercel --prod
```
