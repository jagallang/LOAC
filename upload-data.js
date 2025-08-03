const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, writeBatch } = require('firebase/firestore');
const fs = require('fs');

// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyCS9OXFthkn-3UkJNPsWGitsOvXIPalo8s",
  authDomain: "loac-9ec81.firebaseapp.com",
  projectId: "loac-9ec81",
  storageBucket: "loac-9ec81.firebasestorage.app",
  messagingSenderId: "776850127990",
  appId: "1:776850127990:web:000c6ca1ac71b8faa2b357",
  measurementId: "G-67YDSS8Y03"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function uploadAcademyData() {
  try {
    console.log('학원 데이터 로드 중...');
    const rawData = fs.readFileSync('./src/학원현황.json', 'utf8');
    const academyData = JSON.parse(rawData);
    
    console.log(`총 ${academyData.length}개 경기도 학원 데이터 업로드 시작...`);
    
    // 배치 단위로 업로드 (Firestore는 한 번에 500개까지)
    const batchSize = 500;
    
    for (let i = 0; i < academyData.length; i += batchSize) {
      const batch = writeBatch(db);
      const batchData = academyData.slice(i, i + batchSize);
      
      batchData.forEach((academy, index) => {
        const docId = `academy_${i + index + 1}`;
        const docRef = doc(db, 'academies', docId);
        batch.set(docRef, {
          ...academy,
          id: i + index + 1,
          createdAt: new Date()
        });
      });
      
      await batch.commit();
      console.log(`배치 ${Math.floor(i / batchSize) + 1} 완료 (${i + 1}-${Math.min(i + batchSize, academyData.length)})`);
    }
    
    console.log('모든 학원 데이터 업로드 완료!');
    
    // 지역 데이터 업로드
    console.log('지역 데이터 생성 중...');
    const regions = [...new Set(academyData.map(academy => academy.SIGUN_NM))].filter(Boolean).sort();
    const regionsDoc = doc(db, 'metadata', 'regions');
    await setDoc(regionsDoc, { regions, updatedAt: new Date() });
    
    // 카테고리 데이터 업로드
    console.log('카테고리 데이터 생성 중...');
    const categories = [...new Set(academyData.map(academy => academy.CRSE_CLASS_NM))].filter(Boolean).sort();
    const categoriesDoc = doc(db, 'metadata', 'categories');
    await setDoc(categoriesDoc, { categories, updatedAt: new Date() });
    
    console.log('모든 데이터 업로드 완료!');
    process.exit(0);
    
  } catch (error) {
    console.error('데이터 업로드 실패:', error);
    process.exit(1);
  }
}

uploadAcademyData();