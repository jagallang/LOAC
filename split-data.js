const fs = require('fs');
const path = require('path');

// 학원 데이터를 지역별로 분할하는 스크립트
console.log('학원 데이터 분할 시작...');

// 원본 데이터 로드
const rawData = fs.readFileSync('/Users/isan/Downloads/학원현황.json', 'utf8');
const allData = JSON.parse(rawData);

// public/data 디렉토리 생성
const dataDir = path.join(__dirname, 'public', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 지역별로 데이터 분할
const dataByRegion = {};
const regions = new Set();
const categories = new Set();

allData.forEach(academy => {
  const region = academy.SIGUN_NM;
  if (!region) return;
  
  regions.add(region);
  if (academy.CRSE_CLASS_NM) {
    categories.add(academy.CRSE_CLASS_NM);
  }
  
  if (!dataByRegion[region]) {
    dataByRegion[region] = [];
  }
  dataByRegion[region].push(academy);
});

// 각 지역별로 파일 저장
Object.entries(dataByRegion).forEach(([region, data]) => {
  const fileName = `${region}.json`;
  const filePath = path.join(dataDir, fileName);
  fs.writeFileSync(filePath, JSON.stringify(data), 'utf8');
  console.log(`${fileName} 저장 완료 - ${data.length}개 학원`);
});

// 메타데이터 파일 생성
const metadata = {
  totalAcademies: allData.length,
  regions: Array.from(regions).sort(),
  categories: Array.from(categories).sort(),
  regionStats: Object.entries(dataByRegion).map(([region, data]) => ({
    region,
    count: data.length,
    fileName: `${region}.json`
  })).sort((a, b) => b.count - a.count),
  lastUpdated: new Date().toISOString()
};

fs.writeFileSync(
  path.join(dataDir, 'metadata.json'), 
  JSON.stringify(metadata, null, 2), 
  'utf8'
);

// 인덱스 파일 생성 (검색용 - 간단한 정보만 포함)
const searchIndex = allData.map(academy => ({
  id: academy.FACLT_NM,
  name: academy.FACLT_NM,
  region: academy.SIGUN_NM,
  district: academy.EMD_NM,
  category: academy.CRSE_CLASS_NM,
  representative: academy.REPRSNTV_NM,
  phone: academy.TELNO,
  address: academy.REFINE_ROADNM_ADDR || academy.REFINE_LOTNO_ADDR
}));

// 검색 인덱스를 청크로 분할 (각 5000개씩)
const chunkSize = 5000;
const chunks = [];
for (let i = 0; i < searchIndex.length; i += chunkSize) {
  const chunk = searchIndex.slice(i, i + chunkSize);
  const chunkIndex = Math.floor(i / chunkSize);
  chunks.push(chunkIndex);
  fs.writeFileSync(
    path.join(dataDir, `search-index-${chunkIndex}.json`),
    JSON.stringify(chunk),
    'utf8'
  );
}

// 검색 인덱스 메타데이터
fs.writeFileSync(
  path.join(dataDir, 'search-metadata.json'),
  JSON.stringify({
    totalChunks: chunks.length,
    chunkSize: chunkSize,
    totalRecords: searchIndex.length,
    chunks: chunks
  }, null, 2),
  'utf8'
);

console.log('\n=== 데이터 분할 완료 ===');
console.log(`총 ${allData.length}개 학원 데이터`);
console.log(`${regions.size}개 지역으로 분할`);
console.log(`${categories.size}개 카테고리 발견`);
console.log(`검색 인덱스 ${chunks.length}개 청크로 분할`);
console.log('\n파일 위치: public/data/');