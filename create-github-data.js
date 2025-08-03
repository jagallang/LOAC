const fs = require('fs');
const path = require('path');

console.log('GitHub Pages용 최적화된 데이터 생성...');

// 원본 데이터 로드
const rawData = fs.readFileSync('/Users/isan/Downloads/학원현황.json', 'utf8');
const allData = JSON.parse(rawData);

// docs 디렉토리 생성 (GitHub Pages용)
const docsDir = path.join(__dirname, 'docs');
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

// 1. 압축된 전체 데이터 (필요한 필드만)
const compressedData = allData.map(academy => ({
  n: academy.FACLT_NM,          // name
  r: academy.SIGUN_NM,          // region
  d: academy.EMD_NM,            // district
  c: academy.CRSE_CLASS_NM,     // category
  p: academy.REPRSNTV_NM,       // representative
  t: academy.TELNO,             // tel
  a: academy.REFINE_ROADNM_ADDR || academy.REFINE_LOTNO_ADDR, // address
  lat: academy.REFINE_WGS84_LAT,
  lng: academy.REFINE_WGS84_LOGT
}));

// 데이터를 청크로 분할 (각 10MB 이하로)
const chunkSize = 5000; // 약 2-3MB per chunk
const chunks = [];

for (let i = 0; i < compressedData.length; i += chunkSize) {
  const chunk = compressedData.slice(i, i + chunkSize);
  const chunkId = Math.floor(i / chunkSize);
  
  fs.writeFileSync(
    path.join(docsDir, `data-${chunkId}.json`),
    JSON.stringify(chunk),
    'utf8'
  );
  
  chunks.push({
    id: chunkId,
    start: i,
    end: Math.min(i + chunkSize, compressedData.length),
    count: chunk.length
  });
}

// 2. 메타데이터
const regions = [...new Set(allData.map(a => a.SIGUN_NM))].filter(Boolean).sort();
const categories = [...new Set(allData.map(a => a.CRSE_CLASS_NM))].filter(Boolean).sort();

const metadata = {
  total: allData.length,
  regions: regions,
  categories: categories,
  chunks: chunks,
  lastUpdated: new Date().toISOString()
};

fs.writeFileSync(
  path.join(docsDir, 'metadata.json'),
  JSON.stringify(metadata),
  'utf8'
);

// 3. index.html (CORS 우회용)
const indexHtml = `<!DOCTYPE html>
<html>
<head>
    <title>LOA Academy Data API</title>
    <meta charset="utf-8">
</head>
<body>
    <h1>LOA Academy Data API</h1>
    <p>경기도 학원 데이터 API</p>
    <h2>Available Endpoints:</h2>
    <ul>
        <li><a href="metadata.json">metadata.json</a> - 메타데이터</li>
        ${chunks.map(c => `<li><a href="data-${c.id}.json">data-${c.id}.json</a> - ${c.count}개 학원 (${c.start}-${c.end})</li>`).join('\n        ')}
    </ul>
    <p>Total: ${allData.length} academies</p>
</body>
</html>`;

fs.writeFileSync(path.join(docsDir, 'index.html'), indexHtml, 'utf8');

// 4. 파일 크기 확인
console.log('\n=== 생성된 파일 정보 ===');
const files = fs.readdirSync(docsDir);
let totalSize = 0;

files.forEach(file => {
  const filePath = path.join(docsDir, file);
  const stats = fs.statSync(filePath);
  const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
  totalSize += stats.size;
  console.log(`${file}: ${sizeMB} MB`);
});

console.log(`\n총 크기: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`청크 수: ${chunks.length}개`);
console.log('\n다음 단계:');
console.log('1. GitHub에 새 저장소 생성 (예: loa-academy-data)');
console.log('2. docs 폴더를 GitHub에 푸시');
console.log('3. Settings > Pages에서 Source를 "Deploy from a branch", Branch를 "main", Folder를 "/docs"로 설정');
console.log('4. https://[username].github.io/loa-academy-data/ 에서 데이터 접근 가능');