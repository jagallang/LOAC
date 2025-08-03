// GitHub Pages에서 데이터를 가져오는 API 모듈

// GitHub Pages URL
const GITHUB_DATA_URL = 'https://jagallang.github.io/LOAC';
// 개발 중에는 로컬 파일 사용
const DATA_BASE_URL = process.env.NODE_ENV === 'production' 
  ? GITHUB_DATA_URL 
  : '/docs';

// 캐시 저장소
const dataCache = {
  metadata: null,
  chunks: new Map(),
  allData: null,
  lastUpdated: null
};

// 메타데이터 로드
export const loadMetadata = async () => {
  if (dataCache.metadata) {
    return dataCache.metadata;
  }

  try {
    const response = await fetch(`${DATA_BASE_URL}/metadata.json`);
    const metadata = await response.json();
    dataCache.metadata = metadata;
    return metadata;
  } catch (error) {
    console.error('메타데이터 로드 실패:', error);
    throw error;
  }
};

// 특정 청크 로드
const loadChunk = async (chunkId) => {
  if (dataCache.chunks.has(chunkId)) {
    return dataCache.chunks.get(chunkId);
  }

  try {
    const response = await fetch(`${DATA_BASE_URL}/data-${chunkId}.json`);
    const chunkData = await response.json();
    
    // 압축 해제 (원래 필드명으로 복원)
    const decompressedData = chunkData.map(item => ({
      FACLT_NM: item.n,
      SIGUN_NM: item.r,
      EMD_NM: item.d,
      CRSE_CLASS_NM: item.c,
      REPRSNTV_NM: item.p,
      TELNO: item.t,
      REFINE_ROADNM_ADDR: item.a,
      REFINE_LOTNO_ADDR: item.a,
      REFINE_WGS84_LAT: item.lat,
      REFINE_WGS84_LOGT: item.lng
    }));
    
    dataCache.chunks.set(chunkId, decompressedData);
    return decompressedData;
  } catch (error) {
    console.error(`청크 ${chunkId} 로드 실패:`, error);
    throw error;
  }
};

// 전체 데이터 로드
export const loadAllData = async () => {
  if (dataCache.allData && dataCache.lastUpdated && 
      (Date.now() - dataCache.lastUpdated) < 3600000) { // 1시간 캐시
    return dataCache.allData;
  }

  try {
    const metadata = await loadMetadata();
    const loadPromises = metadata.chunks.map(chunk => loadChunk(chunk.id));
    const allChunks = await Promise.all(loadPromises);
    
    dataCache.allData = allChunks.flat();
    dataCache.lastUpdated = Date.now();
    
    console.log(`전체 ${dataCache.allData.length}개 학원 데이터 로드 완료`);
    return dataCache.allData;
  } catch (error) {
    console.error('전체 데이터 로드 실패:', error);
    throw error;
  }
};

// API 함수들 (기존 API와 동일한 인터페이스)
export const fetchAcademies = async (params = {}) => {
  try {
    console.log('GitHub Pages에서 학원 데이터 로드 중...', params);
    
    const allData = await loadAllData();
    let filteredData = [...allData];
    
    // 검색 필터
    if (params.search) {
      const searchLower = params.search.toLowerCase();
      filteredData = filteredData.filter(academy => {
        const nameMatch = academy.FACLT_NM?.toLowerCase().includes(searchLower);
        const regionMatch = academy.SIGUN_NM?.toLowerCase().includes(searchLower);
        const districtMatch = academy.EMD_NM?.toLowerCase().includes(searchLower);
        const categoryMatch = academy.CRSE_CLASS_NM?.toLowerCase().includes(searchLower);
        const representativeMatch = academy.REPRSNTV_NM?.toLowerCase().includes(searchLower);
        const phoneMatch = academy.TELNO?.includes(searchLower);
        const addressMatch = academy.REFINE_ROADNM_ADDR?.toLowerCase().includes(searchLower);
        
        return nameMatch || regionMatch || districtMatch || categoryMatch || 
               representativeMatch || phoneMatch || addressMatch;
      });
    }
    
    // 지역 필터
    if (params.region && params.region !== '전체') {
      filteredData = filteredData.filter(academy => 
        academy.SIGUN_NM === params.region
      );
    }
    
    // 카테고리 필터
    if (params.category && params.category !== '전체') {
      filteredData = filteredData.filter(academy => 
        academy.CRSE_CLASS_NM === params.category
      );
    }
    
    // 페이지네이션
    const page = params.page || 1;
    const limit = params.limit || 50;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = filteredData.slice(startIndex, endIndex);
    
    return {
      data: paginatedData,
      total: filteredData.length,
      page: page,
      totalPages: Math.ceil(filteredData.length / limit),
      hasMore: endIndex < filteredData.length,
      cache: {
        lastUpdated: new Date(dataCache.lastUpdated),
        totalCached: allData.length
      }
    };
  } catch (error) {
    console.error('학원 데이터 로드 실패:', error);
    return { data: [], total: 0, page: 1, totalPages: 0, hasMore: false };
  }
};

export const fetchRegions = async () => {
  try {
    const metadata = await loadMetadata();
    return metadata.regions || [];
  } catch (error) {
    console.error('지역 데이터 로드 실패:', error);
    return [];
  }
};

export const fetchCategories = async () => {
  try {
    const metadata = await loadMetadata();
    return metadata.categories || [];
  } catch (error) {
    console.error('카테고리 데이터 로드 실패:', error);
    return [];
  }
};