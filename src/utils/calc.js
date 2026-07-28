import * as XLSX from 'xlsx'

// ===== 状态制考勤：工资/状态工具 =====

export function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

// ---- 工作日与日薪计算 ----
// 月基本工资（可调整）
export const MONTHLY_BASE = 3000

// 中国法定公休假日（2025-2027，含调休后实际休息日）
// 注：具体日期以每年国务院通知为准，此处为预估值
const HOLIDAYS = new Set([
  // 2025
  '2025-01-01','2025-01-28','2025-01-29','2025-01-30','2025-01-31','2025-02-01','2025-02-02','2025-02-03',
  '2025-04-04','2025-04-05',
  '2025-05-01','2025-05-02','2025-05-03','2025-05-04',
  '2025-05-31','2025-06-01',
  '2025-10-01','2025-10-02','2025-10-03','2025-10-04','2025-10-05','2025-10-06','2025-10-07',
  // 2026
  '2026-01-01','2026-01-02','2026-01-03',
  '2026-02-17','2026-02-18','2026-02-19','2026-02-20','2026-02-21','2026-02-22','2026-02-23',
  '2026-04-04','2026-04-05',
  '2026-05-01','2026-05-02','2026-05-03','2026-05-04','2026-05-05',
  '2026-06-19','2026-06-20','2026-06-21',
  '2026-09-25','2026-09-26','2026-09-27','2026-10-01','2026-10-02','2026-10-03','2026-10-04','2026-10-05','2026-10-06',
  // 2027
  '2027-01-01','2027-01-02','2027-01-03',
  '2027-02-06','2027-02-07','2027-02-08','2027-02-09','2027-02-10','2027-02-11','2027-02-12',
  '2027-04-04','2027-04-05',
  '2027-05-01','2027-05-02','2027-05-03','2027-05-04','2027-05-05',
  '2027-06-08','2027-06-09','2027-06-10',
  '2027-09-15','2027-09-16','2027-09-17','2027-10-01','2027-10-02','2027-10-03','2027-10-04','2027-10-05','2027-10-06',
])

/** 返回某月工作日天数（排除周六日 + 法定假日） */
export function getWorkingDays(yearMonth) {
  const [y, m] = yearMonth.split('-').map(Number)
  const daysInMonth = new Date(y, m, 0).getDate()
  let count = 0
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(y, m - 1, d)
    const dow = date.getDay() // 0=周日 6=周六
    if (dow === 0 || dow === 6) continue
    const ds = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    if (HOLIDAYS.has(ds)) continue
    count++
  }
  return count
}

/** 返回某月日薪（月基本工资 ÷ 月工作日，取整） */
export function getDailyRate(yearMonth, baseSalary = MONTHLY_BASE) {
  const wd = getWorkingDays(yearMonth)
  return wd > 0 ? Math.round(baseSalary / wd) : 0
}

/** 根据日期返回默认应付工资 */
export function defaultSalary(dateStr, status) {
  if (status === 'absent') return 0
  const month = dateStr.slice(0, 7)
  return getDailyRate(month)
}

// ---- 状态元信息 ----
export function statusMeta(status) {
  if (status === 'absent') return { label: '缺勤', cls: 'st-absent' }
  return { label: '上班', cls: 'st-work' }
}

export function formatMoney(n) {
  if (n == null) return '-'
  return '¥' + Number(n).toFixed(2)
}

// ===== 导出 Excel =====
export function exportToExcel(records, monthLabel) {
  const rows = records.map((r, i) => ({
    序号: i + 1,
    日期: r.date,
    状态: statusMeta(r.status).label,
    应付工资: r.salary,
    备注: r.note || ''
  }))
  const ws = XLSX.utils.json_to_sheet(rows, {
    header: ['序号', '日期', '状态', '应付工资', '备注']
  })
  ws['!cols'] = [
    { wch: 6 }, { wch: 12 }, { wch: 8 }, { wch: 10 }, { wch: 20 }
  ]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, monthLabel || '考勤')
  XLSX.writeFile(wb, `阿姨考勤_${monthLabel || '全部'}.xlsx`)
}
