const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, limit } = require('firebase/firestore');

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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testFirestore() {
  try {
    console.log('Firestore 연결 테스트 중...');
    
    const q = collection(db, 'academies');
    const querySnapshot = await getDocs(q);
    
    console.log(`총 ${querySnapshot.size}개 문서 발견`);
    
    if (querySnapshot.size > 0) {
      console.log('첫 번째 문서:');
      const firstDoc = querySnapshot.docs[0];
      console.log('ID:', firstDoc.id);
      console.log('데이터:', JSON.stringify(firstDoc.data(), null, 2));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Firestore 테스트 실패:', error);
    process.exit(1);
  }
}

testFirestore();