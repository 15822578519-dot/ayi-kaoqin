<template>
  <div class="stat-view">
    <div class="toolbar">
      <div class="month-nav">
        <van-icon name="arrow-left" @click="prevMonth" />
        <span class="month-label">{{ monthLabel }}</span>
        <van-icon name="arrow" @click="nextMonth" />
      </div>
      <van-button size="small" type="primary" plain icon="upgrade" @click="onExport">导出</van-button>
    </div>

    <div class="stat-cards">
      <div class="stat-card card accent-work">
        <div class="val">{{ summary.workDays }}</div>
        <div class="label">出勤天数</div>
      </div>
      <div class="stat-card card accent-absent">
        <div class="val">{{ summary.absentDays }}</div>
        <div class="label">缺勤天数</div>
      </div>
      <div class="stat-card card accent-money">
        <div class="val money">{{ formatMoney(summary.totalSalary) }}</div>
        <div class="label">应付总额</div>
      </div>
    </div>

    <!-- 出勤占比条 -->
    <div class="ratio card">
      <div class="ratio-bar">
        <div class="seg seg-work" :style="{ width: workPct + '%' }"></div>
        <div class="seg seg-absent" :style="{ width: absentPct + '%' }"></div>
      </div>
      <div class="ratio-legend">
        <span><i class="dot dot-work"></i>上班 {{ summary.workDays }} 天</span>
        <span><i class="dot dot-absent"></i>缺勤 {{ summary.absentDays }} 天</span>
      </div>
    </div>

    <div class="link-row">
      <van-button size="small" type="primary" plain icon="calendar-o" @click="goCalendar">
        查看当月日历（哪天上班 / 缺勤）
      </van-button>
    </div>

    <div class="section-title">每日汇总</div>
    <div v-if="groups.length" class="groups">
      <div v-for="g in groups" :key="g.date" class="group card">
        <span class="date">{{ g.date }}</span>
        <span :class="['pill', statusMeta(g.status).cls]">{{ statusMeta(g.status).label }}</span>
        <span class="money">{{ formatMoney(g.daySalary) }}</span>
      </div>
    </div>
    <van-empty v-else description="本月暂无记录" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, inject } from 'vue'
import { showToast } from 'vant'
import { apiList, apiSummary } from '../api/index.js'
import { statusMeta, formatMoney, exportToExcel } from '../utils/calc.js'

const refreshKey = inject('refreshKey')
const nav = inject('nav', null)

const monthDate = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
const summary = ref({ totalSalary: 0, workDays: 0, absentDays: 0, count: 0 })
const list = ref([])

const pad = (n) => String(n).padStart(2, '0')
const monthLabel = computed(() => {
  const d = monthDate.value
  return `${d.getFullYear()}年${pad(d.getMonth() + 1)}月`
})
const monthStr = computed(() => {
  const d = monthDate.value
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
})

const totalDays = computed(() => summary.value.workDays + summary.value.absentDays)
const workPct = computed(() =>
  totalDays.value ? Math.round((summary.value.workDays / totalDays.value) * 100) : 0
)
const absentPct = computed(() => 100 - workPct.value)

const groups = computed(() => {
  const map = new Map()
  for (const r of list.value) {
    if (!map.has(r.date)) map.set(r.date, [])
    map.get(r.date).push(r)
  }
  return Array.from(map.entries()).map(([date, items]) => {
    const status = items.some((r) => (r.status || 'work') === 'work') ? 'work' : 'absent'
    return {
      date,
      status,
      daySalary: items.reduce((s, r) => s + (Number(r.salary) || 0), 0)
    }
  })
})

async function load() {
  const [s, l] = await Promise.all([apiSummary(monthStr.value), apiList(monthStr.value)])
  summary.value = s
  list.value = l
}

function prevMonth() {
  monthDate.value = new Date(monthDate.value.getFullYear(), monthDate.value.getMonth() - 1, 1)
}
function nextMonth() {
  monthDate.value = new Date(monthDate.value.getFullYear(), monthDate.value.getMonth() + 1, 1)
}

function goCalendar() {
  if (nav && nav.goCalendarMonth) nav.goCalendarMonth(monthStr.value)
}

function onExport() {
  if (!list.value.length) return showToast('本月无数据可导出')
  exportToExcel(list.value, monthStr.value)
  showToast('已导出 Excel')
}

watch(monthDate, load)
watch(
  () => refreshKey && refreshKey.value,
  () => load()
)
onMounted(load)
</script>

<style scoped>
.stat-view {
  padding: 4px 0;
}
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 4px 12px;
}
.month-nav {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 16px;
  font-weight: 600;
}
.month-nav .van-icon {
  font-size: 20px;
  color: var(--brand);
  padding: 4px;
}
.stat-cards {
  display: flex;
  gap: 10px;
}
.stat-card {
  flex: 1;
  text-align: center;
  padding: 16px 6px;
  border-top: 3px solid transparent;
}
.accent-work {
  border-top-color: #07c160;
}
.accent-absent {
  border-top-color: #ee0a24;
}
.accent-money {
  border-top-color: var(--brand);
}
.stat-card .val {
  font-size: 20px;
  font-weight: 700;
}
.stat-card .label {
  margin-top: 6px;
  font-size: 12px;
  color: var(--muted);
}
.ratio {
  margin-top: 12px;
  padding: 14px;
}
.ratio-bar {
  display: flex;
  height: 12px;
  border-radius: 999px;
  overflow: hidden;
  background: #f0f0f0;
}
.seg {
  height: 100%;
  transition: width 0.3s;
}
.seg-work {
  background: #07c160;
}
.seg-absent {
  background: #ee0a24;
}
.ratio-legend {
  display: flex;
  justify-content: space-around;
  margin-top: 10px;
  font-size: 13px;
  color: #646566;
}
.dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 4px;
}
.dot-work {
  background: #07c160;
}
.dot-absent {
  background: #ee0a24;
}
.link-row {
  margin-top: 12px;
  text-align: center;
}
.section-title {
  margin: 18px 4px 10px;
  font-size: 14px;
  font-weight: 600;
  color: #646566;
}
.group {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
  padding: 12px 14px;
}
.group .date {
  font-weight: 600;
  min-width: 96px;
}
.group .pill {
  margin-right: auto;
}
</style>
