const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, writeBatch, getDocs } = require('firebase/firestore');
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

async function deleteExistingData() {
  console.log('기존 데이터 삭제 중...');
  
  const academiesRef = collection(db, 'academies');
  const snapshot = await getDocs(academiesRef);
  
  const batchSize = 500;
  const batches = [];
  
  for (let i = 0; i < snapshot.docs.length; i += batchSize) {
    const batch = writeBatch(db);
    const docsToDelete = snapshot.docs.slice(i, i + batchSize);
    
    docsToDelete.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    batches.push(batch);
  }
  
  await Promise.all(batches.map(batch => batch.commit()));
  console.log(`${snapshot.docs.length}개 기존 문서 삭제 완료`);
}

async function uploadAllData() {
  try {
    console.log('경기도 전체 학원 데이터 업로드 시작...');
    
    // 기존 데이터 삭제
    await deleteExistingData();
    
    // 새 데이터 로드
    const rawData = fs.readFileSync('./src/학원현황.json', 'utf8');
    const academyData = JSON.parse(rawData);
    
    console.log(`총 ${academyData.length}개 학원 데이터 업로드 시작...`);
    
    // 배치 단위로 업로드
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
          createdAt: new Date(),
          // 검색을 위한 추가 필드
          searchableText: `${academy.FACLT_NM} ${academy.SIGUN_NM} ${academy.EMD_NM} ${academy.CRSE_CLASS_NM} ${academy.REPRSNTV_NM || ''} ${academy.REFINE_ROADNM_ADDR || academy.REFINE_LOTNO_ADDR}`.toLowerCase()
        });
      });
      
      await batch.commit();
      const progress = Math.round(((i + batchSize) / academyData.length) * 100);
      console.log(`진행률: ${progress}% (${i + batchSize}/${academyData.length})`);
    }
    
    console.log('모든 학원 데이터 업로드 완료!');
    
    // 지역 및 카테고리 메타데이터 업데이트
    console.log('메타데이터 업데이트 중...');
    
    const regions = [...new Set(academyData.map(academy => academy.SIGUN_NM))].filter(Boolean).sort();
    const categories = [...new Set(academyData.map(academy => academy.CRSE_CLASS_NM))].filter(Boolean).sort();
    
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
      totalAcademies: academyData.length,
      totalRegions: regions.length,
      totalCategories: categories.length,
      lastUpdated: new Date()
    });
    
    console.log('메타데이터 업데이트 완료!');
    console.log(`지역 수: ${regions.length}`);
    console.log(`카테고리 수: ${categories.length}`);
    console.log('전체 업로드 완료!');
    
    process.exit(0);
    
  } catch (error) {
    console.error('데이터 업로드 실패:', error);
    process.exit(1);
  }
}

uploadAllData();