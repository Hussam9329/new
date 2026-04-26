import { NextResponse } from 'next/server';

// Endpoint للتشخيص — يظهر إذا متغيرات البيئة موجودة أو لا
export async function GET() {
  const envStatus = {
    GITHUB_TOKEN: !!process.env.GITHUB_TOKEN ? 'موجود' : 'غير موجود',
    GITHUB_REPO: process.env.GITHUB_REPO || 'غير موجود',
    GITHUB_BRANCH: process.env.GITHUB_BRANCH || 'غير موجود',
    GITHUB_DATA_PATH: process.env.GITHUB_DATA_PATH || 'غير موجود',
    DATABASE_URL: !!process.env.DATABASE_URL ? 'موجود' : 'غير موجود',
  };

  // محاولة الاتصال بـ GitHub
  let githubTest = 'لم يتم الاختبار';
  if (process.env.GITHUB_TOKEN) {
    try {
      const res = await fetch(
        `https://api.github.com/repos/${process.env.GITHUB_REPO || 'Hussam9329/new'}/contents/${process.env.GITHUB_DATA_PATH || 'data.json'}?ref=${process.env.GITHUB_BRANCH || 'main'}`,
        {
          headers: {
            Authorization: `token ${process.env.GITHUB_TOKEN}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );
      githubTest = `الحالة: ${res.status} ${res.statusText}`;
    } catch (error: unknown) {
      githubTest = `خطأ: ${error instanceof Error ? error.message : 'غير معروف'}`;
    }
  }

  return NextResponse.json({
    message: 'تشخيص البيئة',
    env: envStatus,
    githubConnection: githubTest,
  });
}
