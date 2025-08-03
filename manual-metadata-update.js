const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

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

async function updateMetadataManually() {
  try {
    console.log('메타데이터 수동 업데이트 시작...');
    
    // 경기도 전체 지역 목록 (실제 데이터에서)
    const allRegions = [
      '가평군', '고양시', '과천시', '광명시', '광주시', '구리시', '군포시', '김포시',
      '남양주시', '동두천시', '부천시', '성남시', '수원시', '시흥시', '안산시', '안성시',
      '안양시', '양주시', '양평군', '여주시', '연천군', '오산시', '용인시', '의왕시',
      '의정부시', '이천시', '파주시', '평택시', '포천시', '하남시', '화성시'
    ];
    
    const allCategories = [
      '국제화', '기예(대)', '기타', '기타(대)', '독서실', '보통교과', '예능', '예능(대)',
      '외국어', '인문사회(대)', '입시.검정 및 보습', '종합(대)', '직업기술'
    ];
    
    // 지역 메타데이터 업데이트
    await setDoc(doc(db, 'metadata', 'regions'), { 
      regions: allRegions, 
      updatedAt: new Date(),
      total: allRegions.length,
      note: '경기도 전체 31개 시군 포함'
    });
    
    // 카테고리 메타데이터 업데이트
    await setDoc(doc(db, 'metadata', 'categories'), { 
      categories: allCategories, 
      updatedAt: new Date(),
      total: allCategories.length 
    });
    
    // 통계 정보 업데이트
    await setDoc(doc(db, 'metadata', 'stats'), {
      totalAcademies: 18500,
      totalRegions: allRegions.length,
      totalCategories: allCategories.length,
      availableRegions: ['가평군', '고양시', '부천시'], // 실제 데이터가 있는 지역
      lastUpdated: new Date(),
      note: '전체 지역 메타데이터는 포함하지만 실제 데이터는 일부 지역만 업로드됨'
    });
    
    console.log('메타데이터 업데이트 완료!');
    console.log(`- 총 지역: ${allRegions.length}개`);
    console.log(`- 총 카테고리: ${allCategories.length}개`);
    console.log('- 현재 데이터 있는 지역: 가평군, 고양시, 부천시');
    
    process.exit(0);
    
  } catch (error) {
    console.error('메타데이터 업데이트 실패:', error);
    process.exit(1);
  }
}

updateMetadataManually();