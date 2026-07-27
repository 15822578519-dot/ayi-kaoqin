import * as XLSX from 'xlsx'

// ===== 状态制考勤：工资/状态工具 =====

export function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

// 默认应付工资：上班 200 元/天，缺勤 0 元/天
export const DEFAULT_SALARY_WORK = 200
export const DEFAULT_SALARY_ABSENT = 0

// 状态元信息：标签 + 样式类（供日历/台账/统计统一使用）
export function statusMeta(status) {
  if (status === 'absent') return { label: '缺勤', cls: 'st-absent' }
  return { label: '上班', cls: 'st-work' } // 缺 status 视为上班（兼容旧数据）
}

export function formatMoney(n) {
  if (n == null) return '-'
  return '¥' + Number(n).toFixed(2)
}

// ===== 导出 Excel（前端生成）=====
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
    { wch: 6 },
    { wch: 12 },
    { wch: 8 },
    { wch: 10 },
    { wch: 20 }
  ]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, monthLabel || '考勤')
  const fileName = `阿姨考勤_${monthLabel || '全部'}.xlsx`
  XLSX.writeFile(wb, fileName)
}
