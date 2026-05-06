const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const VERCEL_PROJECT_ID = 'prj_koHEVubfc8TwOqLVeVc3hvfE0gna';
const VERCEL_ORG_ID = 'team_TTBodN3LOKec9ZvWCg4V9rTz';

console.log('1/3 웹 빌드 중...');
execSync('npx expo export --platform web', { stdio: 'inherit' });

console.log('2/3 Vercel 설정 파일 생성 중...');

fs.writeFileSync(
  path.join('dist', 'vercel.json'),
  JSON.stringify({ rewrites: [{ source: '/(.*)', destination: '/index.html' }] }, null, 2)
);

fs.mkdirSync(path.join('dist', '.vercel'), { recursive: true });
fs.writeFileSync(
  path.join('dist', '.vercel', 'project.json'),
  JSON.stringify({ projectId: VERCEL_PROJECT_ID, orgId: VERCEL_ORG_ID, projectName: 'bookfood' })
);

console.log('3/3 Vercel 배포 중...');
execSync('npx vercel --prod', { stdio: 'inherit', cwd: path.join(process.cwd(), 'dist') });

console.log('\n배포 완료! https://bookfood-ruby.vercel.app');
