import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Phone, Heart, Star, List } from 'lucide-react';
// API 호출 함수들
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://loac-9ec81.web.app/api' 
  : 'http://localhost:5000/api';

const fetchAcademies = async (params = {}) => {
  try {
    const searchParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] && params[key] !== '전체') {
        searchParams.append(key, params[key]);
      }
    });

    const response = await fetch(`${API_BASE_URL}/academies?${searchParams}`);
    if (!response.ok) throw new Error('Failed to fetch academies');
    return await response.json();
  } catch (error) {
    console.error('학원 데이터 로드 실패:', error);
    return { data: [], total: 0, page: 1, totalPages: 0 };
  }
};

const fetchRegions = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/regions`);
    if (!response.ok) throw new Error('Failed to fetch regions');
    return await response.json();
  } catch (error) {
    console.error('지역 데이터 로드 실패:', error);
    return [];
  }
};

const fetchCategories = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/categories`);
    if (!response.ok) throw new Error('Failed to fetch categories');
    return await response.json();
  } catch (error) {
    console.error('카테고리 데이터 로드 실패:', error);
    return [];
  }
};

const AcademyFinder = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAcademy, setSelectedAcademy] = useState(null);
  const [academies, setAcademies] = useState([]);
  const [regions, setRegions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    region: "전체",
    category: "전체"
  });
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 0
  });

  // 초기 데이터 로드
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        const [academiesData, regionsData, categoriesData] = await Promise.all([
          fetchAcademies({ page: 1, limit: 50 }),
          fetchRegions(),
          fetchCategories()
        ]);

        setAcademies(academiesData.data || []);
        setPagination({
          page: academiesData.page || 1,
          total: academiesData.total || 0,
          totalPages: academiesData.totalPages || 0
        });
        setRegions(regionsData || []);
        setCategories(categoriesData || []);
      } catch (error) {
        console.error('초기 데이터 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // 검색 및 필터 처리
  const handleSearch = async () => {
    setLoading(true);
    try {
      const searchParams = {
        search: searchQuery,
        region: filters.region !== "전체" ? filters.region : undefined,
        category: filters.category !== "전체" ? filters.category : undefined,
        page: 1,
        limit: 50
      };

      const result = await fetchAcademies(searchParams);
      setAcademies(result.data || []);
      setPagination({
        page: result.page || 1,
        total: result.total || 0,
        totalPages: result.totalPages || 0
      });
    } catch (error) {
      console.error('검색 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 필터 변경 시 자동 검색
  useEffect(() => {
    if (!loading) {
      const debounceTimer = setTimeout(() => {
        handleSearch();
      }, 300);
      return () => clearTimeout(debounceTimer);
    }
  }, [filters, searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  // 학원 리스트 컴포넌트
  const AcademyList = () => (
    <div className="h-full">
      {/* 필터 영역 */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex gap-2 items-center flex-wrap">
          <select 
            value={filters.region} 
            onChange={(e) => setFilters({...filters, region: e.target.value})}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            disabled={loading}
          >
            <option value="전체">전체 시/군</option>
            {regions.map(region => (
              <option key={region} value={region}>{region}</option>
            ))}
          </select>
          
          <select 
            value={filters.category} 
            onChange={(e) => setFilters({...filters, category: e.target.value})}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            disabled={loading}
          >
            <option value="전체">전체 분야</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          
          <button 
            onClick={() => setFilters({region: "전체", category: "전체"})}
            className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
            disabled={loading}
          >
            초기화
          </button>
        </div>
        
        <div className="mt-2 text-sm text-gray-600">
          {loading ? '로딩 중...' : `총 ${pagination.total}개 학원`}
        </div>
      </div>

      {/* 학원 목록 */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">학원 정보를 불러오는 중...</div>
          </div>
        ) : academies.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-gray-400 text-lg mb-2">🔍</div>
              <div className="text-gray-500">검색 결과가 없습니다</div>
            </div>
          </div>
        ) : (
          academies.map(academy => (
          <div 
            key={academy.FACLT_NM}
            className={`p-4 border-b cursor-pointer transition-all hover:bg-blue-50 ${
              selectedAcademy?.FACLT_NM === academy.FACLT_NM ? 'bg-blue-100 border-l-4 border-l-blue-600' : ''
            }`}
            onClick={() => setSelectedAcademy(academy)}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-lg text-gray-900">{academy.FACLT_NM}</h3>
              <div className="flex items-center space-x-1">
                <Star className="w-4 h-4 text-yellow-500 fill-current" />
                <span className="text-sm font-medium">4.2</span>
                <span className="text-xs text-gray-500">(42)</span>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-1 mb-2">
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                {academy.CRSE_CLASS_NM}
              </span>
            </div>
            
            <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
              <div className="flex items-center space-x-1">
                <MapPin className="w-4 h-4" />
                <span>{academy.SIGUN_NM} {academy.EMD_NM}</span>
              </div>
              {academy.TELNO && (
                <div className="flex items-center space-x-1">
                  <Phone className="w-4 h-4" />
                  <span>{academy.TELNO}</span>
                </div>
              )}
            </div>
            
            <p className="text-sm text-gray-700 mb-3 truncate">
              {academy.REFINE_ROADNM_ADDR || academy.REFINE_LOTNO_ADDR}
            </p>
            
            <div className="flex justify-between items-center">
              <div className="text-sm">
                <span className="font-medium text-blue-600">문의</span>
                <span className="text-gray-500 ml-1">/월</span>
              </div>
              
              {academy.REPRSNTV_NM && (
                <div className="text-xs text-gray-500">
                  원장: {academy.REPRSNTV_NM}
                </div>
              )}
            </div>
          </div>
        )))}
      </div>
    </div>
  );

  // 카카오맵 컴포넌트
  const MapView = () => {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const markers = useRef([]);

    useEffect(() => {
      if (!window.kakao || !window.kakao.maps) {
        console.warn('카카오맵 API가 로드되지 않았습니다. API 키를 확인해주세요.');
        return;
      }

      // 지도 초기화 (경기도 중심좌표)
      const options = {
        center: new window.kakao.maps.LatLng(37.4138, 127.5183), // 경기도 중심좌표
        level: 8
      };

      map.current = new window.kakao.maps.Map(mapContainer.current, options);

      // 마커 표시
      displayMarkers();
    }, []);

    useEffect(() => {
      if (map.current) {
        displayMarkers();
      }
    }, [filteredAcademies, selectedAcademy]); // eslint-disable-line react-hooks/exhaustive-deps

    const displayMarkers = () => {
      if (!map.current) return;

      // 기존 마커 제거
      markers.current.forEach(marker => marker.setMap(null));
      markers.current = [];

      // 새 마커 생성
      academies.forEach(academy => {
        if (academy.REFINE_WGS84_LAT && academy.REFINE_WGS84_LOGT) {
          const position = new window.kakao.maps.LatLng(
            parseFloat(academy.REFINE_WGS84_LAT), 
            parseFloat(academy.REFINE_WGS84_LOGT)
          );
          
          const marker = new window.kakao.maps.Marker({
            position: position,
            title: academy.FACLT_NM
          });

          marker.setMap(map.current);
          markers.current.push(marker);

          // 마커 클릭 이벤트
          window.kakao.maps.event.addListener(marker, 'click', () => {
            setSelectedAcademy(academy);
          });

          // 선택된 학원의 마커 강조
          if (selectedAcademy && selectedAcademy.FACLT_NM === academy.FACLT_NM) {
            // 선택된 마커를 중심으로 지도 이동
            map.current.setCenter(position);
            map.current.setLevel(3);
          }
        }
      });
    };

    return (
      <div className="h-full relative">
        <div 
          ref={mapContainer} 
          className="w-full h-full"
          style={{ minHeight: '400px' }}
        />
        
        {/* 지도 위 정보창 */}
        {selectedAcademy && (
          <div className="absolute top-4 left-4 right-4 bg-white rounded-lg shadow-lg p-4 z-10">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h4 className="font-bold text-lg mb-1">{selectedAcademy.name}</h4>
                <p className="text-sm text-gray-600 mb-2">{selectedAcademy.address}</p>
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    <span className="font-medium">{selectedAcademy.rating}</span>
                    <span className="text-gray-500">({selectedAcademy.reviewCount})</span>
                  </div>
                  <div className="text-blue-600 font-medium">{selectedAcademy.monthlyFee}</div>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedAcademy.subjects.map(subject => (
                    <span key={subject} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                      {subject}
                    </span>
                  ))}
                </div>
              </div>
              <button 
                onClick={() => setSelectedAcademy(null)}
                className="text-gray-400 hover:text-gray-600 ml-2"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* 지도 컨트롤 버튼들 */}
        <div className="absolute bottom-4 right-4 flex flex-col space-y-2">
          <button 
            onClick={() => {
              if (map.current) {
                map.current.setLevel(map.current.getLevel() - 1);
              }
            }}
            className="bg-white rounded-lg shadow-md p-2 hover:bg-gray-50"
          >
            +
          </button>
          <button 
            onClick={() => {
              if (map.current) {
                map.current.setLevel(map.current.getLevel() + 1);
              }
            }}
            className="bg-white rounded-lg shadow-md p-2 hover:bg-gray-50"
          >
            -
          </button>
          <button 
            onClick={() => {
              if (map.current) {
                const center = new window.kakao.maps.LatLng(37.4138, 127.5183);
                map.current.setCenter(center);
                map.current.setLevel(8);
              }
            }}
            className="bg-white rounded-lg shadow-md p-2 hover:bg-gray-50 text-xs"
          >
            🏠
          </button>
        </div>

        {/* 카카오맵 API가 없을 때 표시되는 대체 UI */}
        {(!window.kakao || !window.kakao.maps) && (
          <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                <MapPin className="w-12 h-12 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">지도 영역</h3>
              <p className="text-gray-600 mb-4">카카오맵 API 키가 필요합니다</p>
              <p className="text-sm text-gray-500">
                index.html의 YOUR_KAKAO_API_KEY를 실제 API 키로 교체해주세요
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-blue-600">로아 (LOA) - 학원 대시보드</h1>
            <div className="flex items-center space-x-4">
              <button className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-blue-600 rounded-lg">
                <List className="w-5 h-5" />
                <span>목록보기</span>
              </button>
              <button className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-red-600 rounded-lg">
                <Heart className="w-5 h-5" />
                <span>즐겨찾기</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 검색바 */}
      <div className="bg-white border-b p-4">
        <div className="flex gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="학원명, 과목, 지역을 검색해보세요..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>
          <button 
            onClick={handleSearch}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center space-x-2 font-medium"
          >
            <Search className="w-5 h-5" />
            <span>검색</span>
          </button>
        </div>
      </div>

      {/* 메인 컨텐츠 영역 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 왼쪽 학원 리스트 */}
        <div className="w-1/2 bg-white border-r">
          <AcademyList />
        </div>
        
        {/* 오른쪽 지도 */}
        <div className="w-1/2">
          <MapView />
        </div>
      </div>
    </div>
  );
};

export default AcademyFinder;