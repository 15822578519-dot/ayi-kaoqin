<template>
  <div class="ledger-view">
    <div class="toolbar">
      <div class="month-nav">
        <van-icon name="arrow-left" @click="prevMonth" />
        <span class="month-label">{{ monthLabel }}</span>
        <van-icon name="arrow" @click="nextMonth" />
      </div>
      <van-button size="small" type="primary" plain icon="upgrade" @click="onExport">
        导出
      </van-button>
    </div>

    <div v-if="groups.length" class="groups">
      <div v-for="g in groups" :key="g.date" class="group card">
        <div class="group-head">
          <span>{{ g.date }}</span>
          <span class="money">当日 {{ formatMoney(g.daySalary) }}</span>
        </div>
        <div v-for="r in g.items" :key="r.id" class="item">
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
    </div>

    <van-empty v-else description="本月暂无记录" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, inject } from 'vue'
import { showConfirmDialog, showToast } from 'vant'
import { apiList, apiRemove } from '../api/index.js'
import { statusMeta, formatMoney, exportToExcel } from '../utils/calc.js'

const emit = defineEmits(['edit'])
const refreshKey = inject('refreshKey')

const monthDate = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
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

const groups = computed(() => {
  const map = new Map()
  for (const r of list.value) {
    if (!map.has(r.date)) map.set(r.date, [])
    map.get(r.date).push(r)
  }
  return Array.from(map.entries()).map(([date, items]) => ({
    date,
    items,
    daySalary: items.reduce((s, r) => s + (Number(r.salary) || 0), 0)
  }))
})

async function load() {
  list.value = await apiList(monthStr.value)
}

function prevMonth() {
  monthDate.value = new Date(monthDate.value.getFullYear(), monthDate.value.getMonth() - 1, 1)
}
function nextMonth() {
  monthDate.value = new Date(monthDate.value.getFullYear(), monthDate.value.getMonth() + 1, 1)
}

async function onExport() {
  if (!list.value.length) return showToast('本月无数据可导出')
  exportToExcel(list.value, monthStr.value)
  showToast('已导出 Excel')
}

async function onDelete(r) {
  try {
    await showConfirmDialog({ title: '删除记录', message: `确定删除 ${r.date} 的这条考勤吗？` })
  } catch {
    return
  }
  await apiRemove(r.id)
  showToast('已删除')
  load()
}

watch(monthDate, load)
watch(
  () => refreshKey && refreshKey.value,
  () => load()
)
onMounted(load)
</script>

<style scoped>
.ledger-view {
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
.group {
  margin-bottom: 12px;
}
.group-head {
  display: flex;
  justify-content: space-between;
  font-weight: 600;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 4px;
}
.item {
  padding: 10px 0;
  border-bottom: 1px solid #f7f7f7;
}
.item:last-child {
  border-bottom: none;
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
</style>
