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

async function uploadMoreRegions() {
  try {
    console.log('추가 지역 데이터 업로드 시작...');
    
    // 원본 데이터 로드
    const rawData = fs.readFileSync('./src/학원현황.json', 'utf8');
    const allData = JSON.parse(rawData);
    
    // 현재 Firestore에 없는 지역들의 데이터 선별
    const currentRegions = ['가평군', '고양시', '부천시'];
    const newRegions = ['안양시', '수원시', '성남시', '용인시', '의정부시', '평택시', '안산시', '화성시'];
    
    // 새 지역의 학원 데이터 필터링 (각 지역당 300개씩 제한)
    let newAcademyData = [];
    
    for (const region of newRegions) {
      const regionData = allData.filter(item => item.SIGUN_NM === region).slice(0, 300);
      newAcademyData = newAcademyData.concat(regionData);
      console.log(`${region}: ${regionData.length}개 학원`);
    }
    
    console.log(`총 ${newAcademyData.length}개 추가 학원 데이터 준비됨`);
    
    // 현재 Firestore 문서 수 확인
    const academiesRef = collection(db, 'academies');
    const snapshot = await getDocs(academiesRef);
    const startIndex = snapshot.size;
    
    console.log(`현재 Firestore 문서 수: ${startIndex}개`);
    console.log('추가 업로드 시작...');
    
    // 배치 단위로 업로드 (500개씩)
    const batchSize = 500;
    
    for (let i = 0; i < newAcademyData.length; i += batchSize) {
      const batch = writeBatch(db);
      const batchData = newAcademyData.slice(i, i + batchSize);
      
      batchData.forEach((academy, index) => {
        const docId = `academy_${startIndex + i + index + 1}`;
        const docRef = doc(db, 'academies', docId);
        batch.set(docRef, {
          ...academy,
          id: startIndex + i + index + 1,
          createdAt: new Date(),
          searchableText: `${academy.FACLT_NM} ${academy.SIGUN_NM} ${academy.EMD_NM} ${academy.CRSE_CLASS_NM} ${academy.REPRSNTV_NM || ''} ${academy.REFINE_ROADNM_ADDR || academy.REFINE_LOTNO_ADDR}`.toLowerCase()
        });
      });
      
      await batch.commit();
      console.log(`배치 ${Math.floor(i / batchSize) + 1} 완료 (${i + batchSize}/${newAcademyData.length})`);
      
      // 요청 제한을 피하기 위한 지연
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('추가 데이터 업로드 완료!');
    
    // 메타데이터 업데이트
    console.log('메타데이터 업데이트 중...');
    
    const allRegions = [...currentRegions, ...newRegions].sort();
    const categories = [...new Set(newAcademyData.map(academy => academy.CRSE_CLASS_NM))].filter(Boolean).sort();
    
    await setDoc(doc(db, 'metadata', 'regions'), { 
      regions: allRegions, 
      updatedAt: new Date(),
      total: allRegions.length 
    });
    
    await setDoc(doc(db, 'metadata', 'categories'), { 
      categories, 
      updatedAt: new Date(),
      total: categories.length 
    });
    
    console.log('업로드 완료!');
    console.log(`추가된 지역: ${newRegions.join(', ')}`);
    console.log(`총 지역 수: ${allRegions.length}개`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('추가 업로드 실패:', error);
    process.exit(1);
  }
}

uploadMoreRegions();