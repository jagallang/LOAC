# 로아(LOA) 배포 가이드

## 경기데이터드림 API 할당량 제한 해결 방법

### 방법 1: GitHub Pages를 이용한 무료 데이터 호스팅

1. **GitHub 저장소 생성**
   ```bash
   # GitHub에서 새 저장소 생성 (예: loa-academy-data)
   # Public으로 생성해야 함
   ```

2. **데이터 업로드**
   ```bash
   cd /Users/isan/Desktop/coding/local_academy
   git init
   git add docs/
   git commit -m "Add academy data"
   git remote add origin https://github.com/[username]/loa-academy-data.git
   git push -u origin main
   ```

3. **GitHub Pages 활성화**
   - 저장소 Settings > Pages
   - Source: Deploy from a branch
   - Branch: main, Folder: /docs
   - Save

4. **React 앱 수정**
   ```javascript
   // src/GitHubDataAPI.js 수정
   const GITHUB_DATA_URL = 'https://[username].github.io/loa-academy-data';
   ```

5. **AcademyFinder.js 수정**
   ```javascript
   // 기존 import 대신
   import { fetchAcademies, fetchRegions, fetchCategories } from './GitHubDataAPI';
   ```

### 방법 2: 로컬 API 서버 사용 (현재 방법)

1. **API 서버 실행**
   ```bash
   node api-server.js
   ```

2. **React 앱 실행**
   ```bash
   npm start
   ```

### 방법 3: 정적 파일로 Firebase Hosting 사용

1. **압축된 데이터를 public 폴더에 복사**
   ```bash
   cp -r docs/* public/data/
   ```

2. **빌드 및 배포**
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

## 장단점 비교

| 방법 | 장점 | 단점 |
|------|------|------|
| GitHub Pages | 무료, 제한 없음, CDN 제공 | 초기 설정 필요 |
| 로컬 API | 즉시 사용 가능 | 서버 실행 필요 |
| Firebase 정적 | 간단한 배포 | 용량 제한 있음 |

## 권장 사항

**GitHub Pages 방법을 권장합니다:**
- 완전 무료
- API 호출 제한 없음
- 전 세계 CDN으로 빠른 속도
- 33,201개 전체 데이터 제공
- 7.82MB로 최적화됨