import { knowledgeService } from './services/knowledgeService.js';

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function matchesWord(text: string, keyword: string): boolean {
  const reg = new RegExp(`\\b${escapeRegex(keyword.toLowerCase())}\\b`, 'i');
  return reg.test(text.toLowerCase());
}

const depts = knowledgeService.getDepartments();
const q = 'physics department kaha hai';

for (const d of depts) {
  const deptName = d.name.toLowerCase();
  const code = d.id.replace('dept-', '').toLowerCase();
  const keywords: string[] = [deptName];

  if (code === 'cs-applications') keywords.push('computer science', 'computer applications', 'csa', 'cse', 'mca', 'cs department');
  else if (code === 'physics') keywords.push('physics', 'bhautik');

  for (const kw of keywords) {
    if (matchesWord(q, kw)) {
      console.log(`Matched Dept ${d.id} on keyword: "${kw}"`);
    }
  }
}
