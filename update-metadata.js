const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, getDocs, query, limit } = require('firebase/firestore');

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

async function updateMetadata() {
  try {
    console.log('현재 Firestore 데이터에서 지역/카테고리 추출 중...');
    
    // 모든 학원 데이터 가져오기 (배치로)
    const academiesRef = collection(db, 'academies');
    let allAcademies = [];
    let lastDoc = null;
    
    // 1000개씩 배치로 가져오기
    for (let i = 0; i < 20; i++) { // 최대 20,000개
      let q = query(academiesRef, limit(1000));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) break;
      
      snapshot.forEach(doc => {
        allAcademies.push(doc.data());
      });
      
      console.log(`배치 ${i + 1}: ${snapshot.size}개 문서, 총 ${allAcademies.length}개`);
      
      if (snapshot.size < 1000) break; // 마지막 배치
    }
    
    console.log(`총 ${allAcademies.length}개 학원 데이터 수집 완료`);
    
    // 지역 추출
    const regions = [...new Set(allAcademies.map(academy => academy.SIGUN_NM))].filter(Boolean).sort();
    console.log('발견된 지역:', regions.length, '개');
    console.log('지역 목록:', regions);
    
    // 카테고리 추출  
    const categories = [...new Set(allAcademies.map(academy => academy.CRSE_CLASS_NM))].filter(Boolean).sort();
    console.log('발견된 카테고리:', categories.length, '개');
    console.log('카테고리 목록:', categories);
    
    // 메타데이터 업데이트
    console.log('메타데이터 업데이트 중...');
    
    await setDoc(doc(db, 'metadata', 'regions'), { 
      regions, 
      updatedAt: new Date(),
      total: regions.length 
    });
    
    await setDoc(doc(db, 'metadata', 'categories'), { 
      categories, 
      updatedAt: new Date(),
      total: categories.length 
    });
    
    await setDoc(doc(db, 'metadata', 'stats'), {
      totalAcademies: allAcademies.length,
      totalRegions: regions.length,
      totalCategories: categories.length,
      lastUpdated: new Date()
    });
    
    console.log('메타데이터 업데이트 완료!');
    console.log(`- 총 학원: ${allAcademies.length}개`);
    console.log(`- 총 지역: ${regions.length}개`);
    console.log(`- 총 카테고리: ${categories.length}개`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('메타데이터 업데이트 실패:', error);
    process.exit(1);
  }
}

updateMetadata();