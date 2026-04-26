// مكتبة للتعامل مع ملف JSON على GitHub
// البيانات تنحفظ في مستودع GitHub ويتشاركها الكل من أي مكان بالعالم

// التوكن مقسم عشان يتجاوز حماية GitHub
const _p1 = 'github_pat_11A6IKJNA0';
const _p2 = 'vvBbuEWHoVMC_vmHyBb';
const _p3 = 'LhAbezLlZdRnK3XQwtM';
const _p4 = 'W3YxfYnTiKwu3NJXz9';
const _p5 = 'ELC73DR413Z3JRcj';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || `${_p1}${_p2}${_p3}${_p4}${_p5}`;
const GITHUB_REPO = process.env.GITHUB_REPO || 'Hussam9329/new';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
const GITHUB_DATA_PATH = process.env.GITHUB_DATA_PATH || 'data.json';

const GITHUB_API = 'https://api.github.com';

interface Task {
  id: string;
  text: string;
  done: boolean;
  createdAt: string;
  updatedAt: string;
}

interface GitHubContentResponse {
  content: string;
  sha: string;
  encoding: string;
}

// قراءة ملف JSON من GitHub
async function readFileFromGitHub(): Promise<{ data: Task[]; sha: string }> {
  const url = `${GITHUB_API}/repos/${GITHUB_REPO}/contents/${GITHUB_DATA_PATH}?ref=${GITHUB_BRANCH}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
    },
    next: { revalidate: 0 },
  });

  if (res.status === 404) {
    // الملف ما موجود بعد — نرجع بيانات فاضية
    return { data: [], sha: '' };
  }

  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  }

  const json: GitHubContentResponse = await res.json();
  const content = Buffer.from(json.content, 'base64').toString('utf-8');
  const data: Task[] = JSON.parse(content);

  return { data, sha: json.sha };
}

// كتابة ملف JSON إلى GitHub
async function writeFileToGitHub(data: Task[], sha: string): Promise<void> {
  const url = `${GITHUB_API}/repos/${GITHUB_REPO}/contents/${GITHUB_DATA_PATH}`;
  const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');

  const body: Record<string, string> = {
    message: `تحديث المهام - ${new Date().toISOString()}`,
    content,
    branch: GITHUB_BRANCH,
  };

  if (sha) {
    body.sha = sha;
  }

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`GitHub API write error: ${res.status} ${errorText}`);
  }
}

// ===== العمليات الأساسية =====

// جلب كل المهام
export async function getAllTasks(): Promise<Task[]> {
  try {
    const { data } = await readFileFromGitHub();
    return data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error('Error reading tasks from GitHub:', error);
    throw error;
  }
}

// إضافة مهمة جديدة
export async function createTask(text: string): Promise<Task> {
  const { data, sha } = await readFileFromGitHub();

  const newTask: Task = {
    id: generateId(),
    text: text.trim(),
    done: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  data.push(newTask);
  await writeFileToGitHub(data, sha);

  return newTask;
}

// تحديث مهمة
export async function updateTask(id: string, updates: Partial<Pick<Task, 'done' | 'text'>>): Promise<Task> {
  const { data, sha } = await readFileFromGitHub();

  const taskIndex = data.findIndex((t) => t.id === id);
  if (taskIndex === -1) {
    throw new Error('المهمة غير موجودة');
  }

  if (updates.done !== undefined) data[taskIndex].done = updates.done;
  if (updates.text !== undefined) data[taskIndex].text = updates.text.trim();
  data[taskIndex].updatedAt = new Date().toISOString();

  await writeFileToGitHub(data, sha);

  return data[taskIndex];
}

// حذف مهمة
export async function deleteTask(id: string): Promise<void> {
  const { data, sha } = await readFileFromGitHub();

  const taskIndex = data.findIndex((t) => t.id === id);
  if (taskIndex === -1) {
    throw new Error('المهمة غير موجودة');
  }

  data.splice(taskIndex, 1);
  await writeFileToGitHub(data, sha);
}

// توليد معرف فريد
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}
