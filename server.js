const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// 학원 데이터 로드
let academyData = [];
try {
  const dataPath = path.join(__dirname, 'src', '학원현황.json');
  const rawData = fs.readFileSync(dataPath, 'utf8');
  academyData = JSON.parse(rawData);
  console.log(`학원 데이터 로드 완료: ${academyData.length}개 학원`);
} catch (error) {
  console.error('학원 데이터 로드 실패:', error);
}

// API 엔드포인트들
app.get('/api/academies', (req, res) => {
  try {
    const { search, region, category, page = 1, limit = 20 } = req.query;
    let filteredData = [...academyData];

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
      total: filteredData.length,
      page: parseInt(page),
      totalPages: Math.ceil(filteredData.length / limit),
      hasMore: endIndex < filteredData.length
    });
  } catch (error) {
    console.error('API 에러:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 학원 상세 정보
app.get('/api/academies/:id', (req, res) => {
  try {
    const academy = academyData.find(item => 
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
app.get('/api/regions', (req, res) => {
  try {
    const regions = [...new Set(academyData.map(academy => academy.SIGUN_NM))].filter(Boolean);
    res.json(regions.sort());
  } catch (error) {
    console.error('API 에러:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 카테고리 목록
app.get('/api/categories', (req, res) => {
  try {
    const categories = [...new Set(academyData.map(academy => academy.CRSE_CLASS_NM))].filter(Boolean);
    res.json(categories.sort());
  } catch (error) {
    console.error('API 에러:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 통계 정보
app.get('/api/stats', (req, res) => {
  try {
    const stats = {
      totalAcademies: academyData.length,
      regions: [...new Set(academyData.map(academy => academy.SIGUN_NM))].filter(Boolean).length,
      categories: [...new Set(academyData.map(academy => academy.CRSE_CLASS_NM))].filter(Boolean).length,
      regionBreakdown: academyData.reduce((acc, academy) => {
        const region = academy.SIGUN_NM;
        if (region) {
          acc[region] = (acc[region] || 0) + 1;
        }
        return acc;
      }, {}),
      categoryBreakdown: academyData.reduce((acc, academy) => {
        const category = academy.CRSE_CLASS_NM;
        if (category) {
          acc[category] = (acc[category] || 0) + 1;
        }
        return acc;
      }, {})
    };
    res.json(stats);
  } catch (error) {
    console.error('API 에러:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// React 앱 서빙 (프로덕션용)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`API 엔드포인트: http://localhost:${PORT}/api/academies`);
});