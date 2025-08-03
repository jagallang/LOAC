const express = require('express');
const fs = require('fs');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS 설정
app.use(cors());
app.use(express.json());

// 학원 데이터 로드
let academyDataCache = {
  data: [],
  lastUpdated: null,
  isLoading: false
};

// JSON 파일에서 데이터 로드
const loadAcademyDataFromFile = async () => {
  if (academyDataCache.isLoading) return;
  
  academyDataCache.isLoading = true;
  console.log('JSON 파일에서 학원 데이터 로드 시작...');
  
  try {
    const dataPath = '/Users/isan/Downloads/학원현황.json';
    
    if (!fs.existsSync(dataPath)) {
      throw new Error('학원 데이터 파일을 찾을 수 없습니다.');
    }
    
    const rawData = fs.readFileSync(dataPath, 'utf8');
    const jsonData = JSON.parse(rawData);
    
    academyDataCache = {
      data: jsonData,
      lastUpdated: new Date(),
      isLoading: false
    };
    
    console.log(`총 ${jsonData.length}개 학원 데이터 로드 완료`);
  } catch (error) {
    console.error('JSON 데이터 로드 실패:', error);
    academyDataCache.isLoading = false;
  }
};

// 지역 및 카테고리 추출
const getUniqueRegions = () => {
  return [...new Set(academyDataCache.data.map(academy => academy.SIGUN_NM))].filter(Boolean).sort();
};

const getUniqueCategories = () => {
  return [...new Set(academyDataCache.data.map(academy => academy.CRSE_CLASS_NM))].filter(Boolean).sort();
};

// API 엔드포인트들
// 1. 학원 검색 API
app.get('/api/academies', (req, res) => {
  try {
    const {
      search = '',
      region = '',
      category = '',
      page = 1,
      limit = 50
    } = req.query;

    // 캐시된 데이터 사용
    let filteredData = [...academyDataCache.data];

    // 검색 필터 (모든 필드에서 검색)
    if (search) {
      const searchLower = search.toLowerCase();
      filteredData = filteredData.filter(academy => {
        const nameMatch = academy.FACLT_NM?.toLowerCase().includes(searchLower);
        const regionMatch = academy.SIGUN_NM?.toLowerCase().includes(searchLower);
        const districtMatch = academy.EMD_NM?.toLowerCase().includes(searchLower);
        const categoryMatch = academy.CRSE_CLASS_NM?.toLowerCase().includes(searchLower);
        const representativeMatch = academy.REPRSNTV_NM?.toLowerCase().includes(searchLower);
        const phoneMatch = academy.TELNO?.includes(searchLower);
        const addressMatch = (academy.REFINE_ROADNM_ADDR || academy.REFINE_LOTNO_ADDR)?.toLowerCase().includes(searchLower);
        
        return nameMatch || regionMatch || districtMatch || categoryMatch || 
               representativeMatch || phoneMatch || addressMatch;
      });
    }

    // 지역 필터
    if (region && region !== '전체') {
      filteredData = filteredData.filter(academy => academy.SIGUN_NM === region);
    }

    // 카테고리 필터
    if (category && category !== '전체') {
      filteredData = filteredData.filter(academy => academy.CRSE_CLASS_NM === category);
    }

    // 페이지네이션
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    
    const paginatedData = filteredData.slice(startIndex, endIndex);
    const totalPages = Math.ceil(filteredData.length / limitNum);

    res.json({
      data: paginatedData,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: filteredData.length,
        totalPages: totalPages,
        hasMore: pageNum < totalPages
      },
      cache: {
        lastUpdated: academyDataCache.lastUpdated,
        totalCached: academyDataCache.data.length
      }
    });
  } catch (error) {
    console.error('학원 검색 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 2. 지역 목록 API
app.get('/api/regions', (req, res) => {
  try {
    const regions = getUniqueRegions();
    res.json({
      regions: regions,
      total: regions.length
    });
  } catch (error) {
    console.error('지역 목록 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 3. 카테고리 목록 API  
app.get('/api/categories', (req, res) => {
  try {
    const categories = getUniqueCategories();
    res.json({
      categories: categories,
      total: categories.length
    });
  } catch (error) {
    console.error('카테고리 목록 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 4. 통계 API
app.get('/api/stats', (req, res) => {
  try {
    const regions = getUniqueRegions();
    const categories = getUniqueCategories();
    
    // 지역별 학원 수
    const regionStats = regions.map(region => ({
      region,
      count: academyDataCache.data.filter(academy => academy.SIGUN_NM === region).length
    })).sort((a, b) => b.count - a.count);

    // 카테고리별 학원 수
    const categoryStats = categories.map(category => ({
      category,
      count: academyDataCache.data.filter(academy => academy.CRSE_CLASS_NM === category).length
    })).sort((a, b) => b.count - a.count);

    res.json({
      total: academyDataCache.data.length,
      totalRegions: regions.length,
      totalCategories: categories.length,
      regionStats: regionStats.slice(0, 10), // 상위 10개
      categoryStats: categoryStats.slice(0, 10), // 상위 10개
      cache: {
        lastUpdated: academyDataCache.lastUpdated,
        isLoading: academyDataCache.isLoading
      }
    });
  } catch (error) {
    console.error('통계 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 5. 특정 학원 상세 정보 API
app.get('/api/academy/:id', (req, res) => {
  try {
    const { id } = req.params;
    const academy = academyDataCache.data.find(academy => academy.FACLT_NM === decodeURIComponent(id));
    
    if (!academy) {
      return res.status(404).json({ error: '학원을 찾을 수 없습니다.' });
    }

    res.json(academy);
  } catch (error) {
    console.error('학원 상세 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 6. 데이터 새로고침 API
app.post('/api/refresh', async (req, res) => {
  try {
    if (academyDataCache.isLoading) {
      return res.json({ message: '이미 데이터를 로드 중입니다.', isLoading: true });
    }

    // 백그라운드에서 데이터 새로고침
    loadAcademyDataFromFile();
    
    res.json({ 
      message: '데이터 새로고침을 시작했습니다.', 
      isLoading: true,
      lastUpdated: academyDataCache.lastUpdated
    });
  } catch (error) {
    console.error('데이터 새로고침 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 헬스체크 API
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    dataLoaded: academyDataCache.data.length > 0,
    totalAcademies: academyDataCache.data.length,
    lastUpdated: academyDataCache.lastUpdated,
    isLoading: academyDataCache.isLoading,
    apiSource: '경기데이터드림 API'
  });
});

// 서버 시작 및 초기 데이터 로드
app.listen(PORT, async () => {
  console.log(`🚀 API 서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`🌐 API 엔드포인트:`);
  console.log(`   - GET /api/academies - 학원 검색`);
  console.log(`   - GET /api/regions - 지역 목록`);
  console.log(`   - GET /api/categories - 카테고리 목록`);
  console.log(`   - GET /api/stats - 통계 정보`);
  console.log(`   - GET /api/academy/:id - 학원 상세 정보`);
  console.log(`   - POST /api/refresh - 데이터 새로고침`);
  console.log(`   - GET /api/health - 헬스체크`);
  
  // 서버 시작 후 초기 데이터 로드
  console.log('🔄 JSON 파일에서 초기 데이터 로드 시작...');
  await loadAcademyDataFromFile();
});

module.exports = app;