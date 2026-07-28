<template>
  <div class="calendar-view">
    <!-- 自定义日历头部 -->
    <div class="cal-header">
      <button class="cal-nav" @click="goMonth(-1)">‹</button>
      <span class="cal-title" @click="goToday">{{ year }}年{{ monPad }}月</span>
      <button class="cal-nav" @click="goMonth(1)">›</button>
      <button class="today-btn" @click="goToday">今天</button>
    </div>

    <!-- 星期头 -->
    <div class="cal-weekdays">
      <span v-for="w in weekdays" :key="w" class="cal-wd">{{ w }}</span>
    </div>

    <!-- 日期网格 -->
    <div class="cal-grid">
      <div
        v-for="(day, i) in grid"
        :key="i"
        class="cal-cell"
        :class="cellClass(day)"
        @click="day && day.cur && onSelectDate(day.date)"
      >
        <template v-if="day">
          <span class="cell-num">{{ day.num }}</span>
          <span v-if="day.label" class="cell-label">{{ day.label }}</span>
        </template>
      </div>
    </div>

    <!-- 当日明细弹窗 -->
    <van-popup v-model:show="showDetail" position="bottom" round :style="{ maxHeight: '75%' }">
      <div class="detail">
        <div class="detail-head">
          <span>{{ selectedDate }} 考勤</span>
          <van-icon name="cross" @click="showDetail = false" />
        </div>
        <div v-if="dayRecords.length" class="detail-list">
          <div v-for="r in dayRecords" :key="r.id" class="detail-item">
            <div class="line1">
              <span :class="['pill', statusMeta(r.status).cls]">{{ statusMeta(r.status).label }}</span>
              <span class="money">{{ formatMoney(r.salary) }}</span>
            </div>
            <div v-if="r.note" class="note">备注：{{ r.note }}</div>
            <div class="ops">
              <van-button size="mini" plain type="primary" @click="emit('edit', r)">编辑</van-button>
              <van-button size="mini" plain type="danger" @click="onDelete(r)">删除</van-button>
            </div>
          </div>
        </div>
        <van-empty v-else description="当天暂无记录" />
        <div class="detail-foot">
          <van-button type="primary" block round @click="emit('add', selectedDate)">新增当天记录</van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, inject, watch, computed } from 'vue'
import { showConfirmDialog, showToast } from 'vant'
import { apiList, apiRemove } from '../api/index.js'
import { statusMeta, formatMoney } from '../utils/calc.js'

const emit = defineEmits(['add', 'edit'])
const refreshKey = inject('refreshKey')
const jumpMonth = inject('jumpMonth', ref(''))

// ---- 当前查看的年月 ----
const today = new Date()
const year = ref(today.getFullYear())
const month = ref(today.getMonth()) // 0-11
const monPad = computed(() => String(month.value + 1).padStart(2, '0'))

const weekdays = ['日', '一', '二', '三', '四', '五', '六']

// ---- 考勤记录缓存 ----
const recordsByDate = ref({})
const loadedMonths = ref(new Set())

function fmt(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

async function loadMonth(ym) {
  if (!ym || loadedMonths.value.has(ym)) return
  loadedMonths.value.add(ym)
  const list = await apiList(ym)
  const map = { ...recordsByDate.value }
  for (const r of list) {
    ;(map[r.date] = map[r.date] || []).push(r)
  }
  recordsByDate.value = map
}

// ---- 日历网格 ----
const grid = computed(() => {
  const y = year.value
  const m = month.value
  const first = new Date(y, m, 1)
  const startDow = first.getDay() // 0=日
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const cells = []

  // 填充前面的空白
  for (let i = 0; i < startDow; i++) cells.push(null)

  // 日期格子
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(y, m, d)
    const ds = fmt(date)
    const items = recordsByDate.value[ds]
    const st = items && items.length
      ? (items.some(r => (r.status || 'work') === 'work') ? 'work' : 'absent')
      : null
    cells.push({
      date: ds,
      num: d,
      cur: true,
      today: ds === fmt(today),
      status: st,
      label: st ? statusMeta(st).label : null
    })
  }
  return cells
})

function cellClass(day) {
  if (!day) return 'empty'
  const c = []
  if (day.today) c.push('is-today')
  if (day.status === 'work') c.push('has-work')
  if (day.status === 'absent') c.push('has-absent')
  return c
}

// ---- 导航 ----
function goMonth(delta) {
  let m = month.value + delta
  let y = year.value
  if (m < 0) { y--; m = 11 }
  if (m > 11) { y++; m = 0 }
  year.value = y
  month.value = m
  const ym = `${y}-${String(m + 1).padStart(2, '0')}`
  loadMonth(ym)
}

function goToday() {
  const t = new Date()
  year.value = t.getFullYear()
  month.value = t.getMonth()
  const ym = `${year.value}-${String(month.value + 1).padStart(2, '0')}`
  loadMonth(ym)
}

// ---- 日期选择 / 明细 ----
const showDetail = ref(false)
const selectedDate = ref('')
const dayRecords = ref([])

function onSelectDate(ds) {
  selectedDate.value = ds
  dayRecords.value = recordsByDate.value[ds] || []
  showDetail.value = true
}

async function onDelete(r) {
  try {
    await showConfirmDialog({ title: '删除记录', message: `确定删除 ${r.date} 的这条考勤吗？` })
  } catch { return }
  await apiRemove(r.id)
  showToast('已删除')
  loadedMonths.value = new Set()
  recordsByDate.value = {}
  const m = r.date.slice(0, 7)
  await loadMonth(m)
  dayRecords.value = recordsByDate.value[r.date] || []
}

// ---- 初始化 & 刷新 ----
const initMonth = `${year.value}-${monPad.value}`
loadMonth(initMonth)

watch(jumpMonth, (m) => {
  if (m && /^\d{4}-\d{2}$/.test(m)) {
    const [y, mo] = m.split('-').map(Number)
    year.value = y
    month.value = mo - 1
    loadMonth(m)
  }
})

watch(() => refreshKey && refreshKey.value, () => {
  loadedMonths.value = new Set()
  recordsByDate.value = {}
  loadMonth(`${year.value}-${monPad.value}`)
})
</script>

<style scoped>
.calendar-view {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
}
/* 头部 */
.cal-header {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px 10px 10px;
  gap: 6px;
}
.cal-title {
  font-size: 17px;
  font-weight: 600;
  min-width: 100px;
  text-align: center;
  cursor: pointer;
  color: #3a3330;
}
.cal-nav {
  width: 34px;
  height: 34px;
  border: none;
  background: #f5f2ef;
  border-radius: 50%;
  font-size: 20px;
  color: #666;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.today-btn {
  margin-left: 8px;
  padding: 5px 14px;
  border: 1px solid var(--brand);
  background: #fff;
  color: var(--brand);
  border-radius: 14px;
  font-size: 13px;
  cursor: pointer;
}
/* 星期 */
.cal-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  padding: 6px 0;
  font-size: 12px;
  color: #999;
  border-bottom: 1px solid #f0efe9;
}
/* 日期网格 */
.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  padding: 4px 6px 10px;
}
.cal-cell {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-size: 15px;
  position: relative;
  cursor: default;
  margin: 2px;
}
.cal-cell.empty {
  background: transparent;
}
.cell-num {
  font-weight: 500;
}
.cell-label {
  font-size: 9px;
  line-height: 1;
  margin-top: 1px;
}
/* 状态色 */
.has-work {
  background: rgba(7, 193, 96, 0.12);
  color: #07c160;
  font-weight: 600;
}
.has-work .cell-label { color: #07c160; }
.has-absent {
  background: rgba(238, 10, 36, 0.1);
  color: #ee0a24;
  font-weight: 600;
}
.has-absent .cell-label { color: #ee0a24; }
/* 今天 */
.is-today {
  box-shadow: inset 0 0 0 1.5px var(--brand);
}
.is-today::after {
  content: '今';
  position: absolute;
  top: 2px;
  right: 4px;
  font-size: 9px;
  line-height: 1;
  font-weight: 700;
  color: var(--brand);
}
/* 明细弹窗（同原样式） */
.detail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  font-weight: 600;
  border-bottom: 1px solid #f0f0f0;
}
.detail-list {
  padding: 8px 16px;
  max-height: 50vh;
  overflow: auto;
}
.detail-item {
  padding: 12px 0;
  border-bottom: 1px solid #f5f5f5;
}
.line1 {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 16px;
}
.note {
  margin-top: 6px;
  font-size: 13px;
  color: #646566;
}
.ops {
  margin-top: 8px;
  display: flex;
  gap: 10px;
}
.detail-foot {
  padding: 12px 16px calc(16px + env(safe-area-inset-bottom));
}
</style>
