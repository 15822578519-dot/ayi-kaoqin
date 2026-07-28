<template>
  <div class="calendar-view">
    <van-calendar
      ref="calendarRef"
      :key="calKey"
      :poppable="false"
      :show-confirm="false"
      :min-date="minDate"
      :max-date="maxDate"
      :default-date="defaultDate"
      :formatter="formatter"
      :style="{ height: '100%' }"
      @select="onSelect"
      @month-show="onMonthShow"
    />

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
          <van-button type="primary" block round @click="emit('add', selectedDate)">
            新增当天记录
          </van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, inject, onMounted, watch, nextTick } from 'vue'
import { showConfirmDialog, showToast } from 'vant'
import { apiList, apiRemove } from '../api/index.js'
import { statusMeta, formatMoney } from '../utils/calc.js'

const emit = defineEmits(['add', 'edit'])
const refreshKey = inject('refreshKey')
const jumpMonth = inject('jumpMonth', ref(''))

const today = new Date()
const minDate = new Date(today.getFullYear() - 1, 0, 1)
const maxDate = new Date(today.getFullYear() + 1, 11, 31)

// 跳转月：统计页点击"查看当月日历"时定位
function parseMonth(m) {
  if (!m || !/^\d{4}-\d{2}$/.test(m)) return null
  const [y, mo] = m.split('-').map(Number)
  return new Date(y, mo - 1, 1)
}
const defaultDate = ref(parseMonth(jumpMonth.value) || today)
const calKey = ref(0)
const calendarRef = ref(null)

const recordsByDate = ref({})
const loadedMonths = ref(new Set())
const showDetail = ref(false)
const selectedDate = ref('')
const dayRecords = ref([])

function fmt(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

async function loadMonth(month) {
  if (!month || loadedMonths.value.has(month)) return
  loadedMonths.value.add(month)
  try {
    const list = await apiList(month)
    const map = { ...recordsByDate.value }
    for (const r of list) {
      ;(map[r.date] = map[r.date] || []).push(r)
    }
    recordsByDate.value = map
  } catch (e) {
    loadedMonths.value.delete(month)
  }
}

// 聚合状态：有"上班"优先标绿，否则有"缺勤"标红
function dayStatus(items) {
  if (!items || !items.length) return null
  if (items.some((r) => (r.status || 'work') === 'work')) return 'work'
  return 'absent'
}

function formatter(day) {
  const items = recordsByDate.value[fmt(day.date)]
  const st = dayStatus(items)
  if (st) {
    day.bottomInfo = statusMeta(st).label
    day.className = st === 'work' ? 'has-work' : 'has-absent'
  }
  if (fmt(day.date) === fmt(today)) {
    day.className = (day.className ? day.className + ' ' : '') + 'is-today'
  }
  return day
}

function onSelect(date) {
  selectedDate.value = fmt(date)
  dayRecords.value = recordsByDate.value[selectedDate.value] || []
  showDetail.value = true
}

function onMonthShow({ date }) {
  loadMonth(fmt(new Date(date.getFullYear(), date.getMonth(), 1)))
}

async function onDelete(r) {
  try {
    await showConfirmDialog({ title: '删除记录', message: `确定删除 ${r.date} 的这条考勤吗？` })
  } catch {
    return
  }
  await apiRemove(r.id)
  showToast('已删除')
  loadedMonths.value = new Set()
  recordsByDate.value = {}
  await loadMonth(selectedDate.value.slice(0, 7))
  dayRecords.value = recordsByDate.value[selectedDate.value] || []
}

// 打开时定位到「今天所在月」与「有记录最近一个月」中更晚的那个，避免从年初往下翻
function resolveOpenMonth() {
  const now = new Date()
  const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  let latest = ''
  try {
    const raw = localStorage.getItem('ayi_kaoqin_records')
    if (raw) {
      for (const r of JSON.parse(raw)) {
        if (r.date > latest) latest = r.date
      }
    }
  } catch (e) { /* 忽略 */ }
  const target = latest && latest.slice(0, 7) > curMonth ? latest.slice(0, 7) : curMonth
  return `${target}-01`
}

onMounted(() => {
  const d = resolveOpenMonth()
  defaultDate.value = new Date(d)
  loadMonth(d.slice(0, 7))
  nextTick(() => {
    calendarRef.value?.scrollToDate(defaultDate.value)
  })
})

// 统计页跳转
watch(jumpMonth, (m) => {
  const d = parseMonth(m)
  if (d) {
    defaultDate.value = d
    calKey.value++
    loadedMonths.value = new Set()
    recordsByDate.value = {}
    loadMonth(m)
  }
})

// 新增/编辑后刷新
watch(
  () => refreshKey && refreshKey.value,
  () => {
    loadedMonths.value = new Set()
    recordsByDate.value = {}
    loadMonth(selectedDate.value ? selectedDate.value.slice(0, 7) : fmt(defaultDate.value).slice(0, 7))
  }
)
</script>

<style scoped>
.calendar-view {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
}
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

<style>
/* 状态色标：上班绿、缺勤红 */
.van-calendar__day.has-work {
  color: #07c160;
  font-weight: 600;
  background: rgba(7, 193, 96, 0.12);
  border-radius: 6px;
}
.van-calendar__day.has-work .van-calendar__bottom-info {
  color: #07c160;
}
.van-calendar__day.has-absent {
  color: #ee0a24;
  font-weight: 600;
  background: rgba(238, 10, 36, 0.1);
  border-radius: 6px;
}
.van-calendar__day.has-absent .van-calendar__bottom-info {
  color: #ee0a24;
}
/* 今天标记：品牌色内描边 + 右上角"今"角标 */
.van-calendar__day.is-today {
  position: relative;
  box-shadow: inset 0 0 0 1.5px var(--brand);
}
.van-calendar__day.is-today::after {
  content: '\4ECA';
  position: absolute;
  top: 2px;
  right: 4px;
  font-size: 9px;
  line-height: 1;
  font-weight: 700;
  color: var(--brand);
}
</style>
