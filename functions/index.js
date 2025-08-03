const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(express.json());

// 경기데이터드림 API 설정
const GG_API_KEY = 'd39d1c0dea6e4059a89f9e640fe1e018';
const GG_API_BASE_URL = 'https://openapi.gg.go.kr/Tbinstutm';

// 캐시된 학원 데이터
let academyDataCache = {
  data: [],
  lastUpdated: null,
  isLoading: false
};

// 경기데이터드림 API에서 데이터 가져오기
const fetchFromGGAPI = async (params = {}) => {
  try {
    const {
      SIGUN_NM = '',
      pIndex = 1,
      pSize = 1000
    } = params;

    const apiParams = {
      KEY: GG_API_KEY,
      Type: 'json',
      pIndex: pIndex,
      pSize: pSize
    };

    if (SIGUN_NM) {
      apiParams.SIGUN_NM = SIGUN_NM;
    }

    console.log('경기데이터드림 API 호출:', apiParams);

    const response = await axios.get(GG_API_BASE_URL, {
      params: apiParams,
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    console.log('API 응답 받음');
    
    if (response.data && response.data.Tbinstutm) {
      const tbinstutm = response.data.Tbinstutm;
      
      // 배열의 두 번째 요소가 실제 데이터
      if (Array.isArray(tbinstutm) && tbinstutm.length > 1) {
        const result = tbinstutm[1];
        if (result && result.row) {
          const totalCount = tbinstutm[0] && tbinstutm[0].list_total_count 
            ? parseInt(tbinstutm[0].list_total_count) 
            : result.row.length;
          
          return {
            data: result.row,
            total: totalCount
          };
        }
      }
    }

    return { data: [], total: 0 };
  } catch (error) {
    console.error('경기데이터드림 API 오류:', error.message);
    // API 실패 시 로컬 데이터 사용
    return await loadLocalData();
  }
};

// 로컬 JSON 파일에서 데이터 로드 (백업용)
const loadLocalData = async () => {
  try {
    const dataPath = path.join(__dirname, '학원현황.json');
    if (fs.existsSync(dataPath)) {
      const rawData = fs.readFileSync(dataPath, 'utf8');
      const jsonData = JSON.parse(rawData);
      console.log(`로컬 데이터 로드 완료: ${jsonData.length}개 학원`);
      return { data: jsonData, total: jsonData.length };
    }
    return { data: [], total: 0 };
  } catch (error) {
    console.error('로컬 데이터 로드 실패:', error);
    return { data: [], total: 0 };
  }
};

// 전체 데이터 로드 (API 우선, 실패 시 로컬 데이터)
const loadAllAcademyData = async () => {
  if (academyDataCache.isLoading) return academyDataCache.data;
  
  academyDataCache.isLoading = true;
  console.log('학원 데이터 로드 시작...');
  
  try {
    // 먼저 API에서 데이터 로드 시도
    const result = await fetchFromGGAPI({ pIndex: 1, pSize: 1000 });
    
    if (result.data.length > 0) {
      // API 성공 - 전체 데이터 로드
      let allData = [...result.data];
      const totalPages = Math.ceil(result.total / 1000);
      
      console.log(`총 ${result.total}개 데이터, ${totalPages}페이지`);
      
      // 나머지 페이지들 로드 (최대 10페이지로 제한)
      for (let page = 2; page <= Math.min(totalPages, 10); page++) {
        try {
          const pageResult = await fetchFromGGAPI({ pIndex: page, pSize: 1000 });
          allData = [...allData, ...pageResult.data];
          console.log(`페이지 ${page}/${totalPages} 로드 완료 - 총 ${allData.length}개`);
          
          // 요청 제한을 위한 지연
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          console.error(`페이지 ${page} 로드 실패:`, error.message);
          break;
        }
      }
      
      academyDataCache = {
        data: allData,
        lastUpdated: new Date(),
        isLoading: false
      };
      
      console.log(`API에서 총 ${allData.length}개 학원 데이터 로드 완료`);
    } else {
      // API 실패 - 로컬 데이터 사용
      const localResult = await loadLocalData();
      academyDataCache = {
        data: localResult.data,
        lastUpdated: new Date(),
        isLoading: false
      };
      console.log(`로컬에서 총 ${localResult.data.length}개 학원 데이터 로드 완료`);
    }
  } catch (error) {
    console.error('전체 데이터 로드 실패:', error);
    // 실패 시 로컬 데이터 사용
    const localResult = await loadLocalData();
    academyDataCache = {
      data: localResult.data,
      lastUpdated: new Date(),
      isLoading: false
    };
  }
  
  return academyDataCache.data;
};

// 서버 시작 시 데이터 로드
loadAllAcademyData();

// API 엔드포인트들
app.get('/academies', (req, res) => {
  try {
    const { search, region, category, page = 1, limit = 50 } = req.query;
    let filteredData = [...academyDataCache.data];

    // 검색 필터
    if (search) {
      const searchLower = search.toLowerCase();
      filteredData = filteredData.filter(academy => 
        academy.FACLT_NM?.toLowerCase().includes(searchLower) ||
        academy.SIGUN_NM?.toLowerCase().includes(searchLower) ||
        academy.EMD_NM?.toLowerCase().includes(searchLower) ||
        academy.CRSE_CLASS_NM?.toLowerCase().includes(searchLower)
      );
    }

    // 지역 필터 (시군명)
    if (region) {
      filteredData = filteredData.filter(academy => 
        academy.SIGUN_NM?.includes(region)
      );
    }

    // 카테고리 필터 (과정분류명)
    if (category) {
      filteredData = filteredData.filter(academy => 
        academy.CRSE_CLASS_NM?.includes(category)
      );
    }

    // 페이지네이션
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedData = filteredData.slice(startIndex, endIndex);

    res.json({
      data: paginatedData,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredData.length,
        totalPages: Math.ceil(filteredData.length / limit),
        hasMore: endIndex < filteredData.length
      },
      cache: {
        lastUpdated: academyDataCache.lastUpdated,
        totalCached: academyDataCache.data.length
      }
    });
  } catch (error) {
    console.error('API 에러:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 학원 상세 정보
app.get('/academies/:id', (req, res) => {
  try {
    const academy = academyDataCache.data.find(item => 
      item.FACLT_NM === decodeURIComponent(req.params.id)
    );
    
    if (!academy) {
      return res.status(404).json({ error: '학원을 찾을 수 없습니다.' });
    }

    res.json(academy);
  } catch (error) {
    console.error('API 에러:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 지역 목록
app.get('/regions', (req, res) => {
  try {
    const regions = [...new Set(academyDataCache.data.map(academy => academy.SIGUN_NM))].filter(Boolean);
    res.json({
      regions: regions.sort(),
      total: regions.length
    });
  } catch (error) {
    console.error('API 에러:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 카테고리 목록
app.get('/categories', (req, res) => {
  try {
    const categories = [...new Set(academyDataCache.data.map(academy => academy.CRSE_CLASS_NM))].filter(Boolean);
    res.json({
      categories: categories.sort(),
      total: categories.length
    });
  } catch (error) {
    console.error('API 에러:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 통계 정보
app.get('/stats', (req, res) => {
  try {
    const regions = [...new Set(academyDataCache.data.map(academy => academy.SIGUN_NM))].filter(Boolean);
    const categories = [...new Set(academyDataCache.data.map(academy => academy.CRSE_CLASS_NM))].filter(Boolean);
    
    const regionStats = regions.map(region => ({
      region,
      count: academyDataCache.data.filter(academy => academy.SIGUN_NM === region).length
    })).sort((a, b) => b.count - a.count);

    const categoryStats = categories.map(category => ({
      category,
      count: academyDataCache.data.filter(academy => academy.CRSE_CLASS_NM === category).length
    })).sort((a, b) => b.count - a.count);

    res.json({
      total: academyDataCache.data.length,
      totalRegions: regions.length,
      totalCategories: categories.length,
      regionStats: regionStats.slice(0, 10),
      categoryStats: categoryStats.slice(0, 10),
      cache: {
        lastUpdated: academyDataCache.lastUpdated,
        isLoading: academyDataCache.isLoading
      }
    });
  } catch (error) {
    console.error('API 에러:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 데이터 새로고침 API
app.post('/refresh', async (req, res) => {
  try {
    if (academyDataCache.isLoading) {
      return res.json({ message: '이미 데이터를 로드 중입니다.', isLoading: true });
    }

    // 백그라운드에서 데이터 새로고침
    loadAllAcademyData();
    
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
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    dataLoaded: academyDataCache.data.length > 0,
    totalAcademies: academyDataCache.data.length,
    lastUpdated: academyDataCache.lastUpdated,
    isLoading: academyDataCache.isLoading,
    apiSource: '경기데이터드림 API + 로컬 백업'
  });
});

// Firebase Functions로 내보내기
exports.api = functions.region('asia-northeast3').https.onRequest(app);