import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const baseUrl = __ENV.API_BASE_URL || 'http://localhost:5000/api/v1';

const searchTrend = new Trend('search_duration');
const todayTrend = new Trend('today_duration');

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: 25 },
    { duration: '30s', target: 50 },
    { duration: '30s', target: 100 },
    { duration: '30s', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    errors: ['rate<0.05'],
    search_duration: ['p(95)<500'],
    today_duration: ['p(95)<500'],
  },
};

export default function () {
  const randomSeries = Math.floor(Math.random() * 4) + 1;

  const todayResp = http.get(`${baseUrl}/reading/series/${randomSeries}/today`, {
    tags: { name: 'GetTodayReading' },
  });

  check(todayResp, {
    'today status is 200 or 401': (r) => r.status === 200 || r.status === 401,
  });

  if (todayResp.status === 200) {
    todayTrend.add(todayResp.timings.duration);
  } else {
    errorRate.add(1);
  }

  sleep(Math.random() * 0.5 + 0.1);

  const searchTerms = ['faith', 'love', 'hope', 'grace', 'truth', 'light'];
  const term = searchTerms[Math.floor(Math.random() * searchTerms.length)];

  const searchResp = http.get(
    `${baseUrl}/search?q=${term}&seriesId=${randomSeries}&page=1&pageSize=10`,
    { tags: { name: 'SearchReadings' } }
  );

  check(searchResp, {
    'search status is 200 or 401': (r) => r.status === 200 || r.status === 401,
  });

  if (searchResp.status === 200) {
    searchTrend.add(searchResp.timings.duration);
  } else {
    errorRate.add(1);
  }

  sleep(Math.random() * 0.5 + 0.1);
}
