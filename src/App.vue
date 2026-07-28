<template>
  <div class="app-root">
    <header class="app-header">
      <span class="header-title">{{ title }}</span>
      <van-icon name="qr" class="header-qr" @click="showQR = true" />
    </header>

    <main class="page">
      <Calendar v-if="active === 'calendar'" @add="openAdd" @edit="openEdit" />
      <Ledger v-else-if="active === 'ledger'" @add="openAdd" @edit="openEdit" />
      <Statistics v-else-if="active === 'statistics'" @add="openAdd" />
    </main>

    <button class="fab" aria-label="新增考勤" @click="openAdd()">＋</button>

    <div class="sync-status">{{ syncMsg }}</div>

    <van-tabbar v-model="active" safe-area-inset-bottom>
      <van-tabbar-item name="calendar" icon="calendar-o">日历</van-tabbar-item>
      <van-tabbar-item name="ledger" icon="notes-o">台账</van-tabbar-item>
      <van-tabbar-item name="statistics" icon="chart-trending-o">统计</van-tabbar-item>
    </van-tabbar>

    <RecordForm
      v-if="formVisible"
      :record="editing"
      :initial-date="formDate"
      @close="closeForm"
      @saved="onSaved"
    />

    <ShareQR v-model="showQR" />
  </div>
</template>

<script setup>
import { ref, computed, provide, onMounted } from 'vue'
import Calendar from './views/Calendar.vue'
import Ledger from './views/Ledger.vue'
import Statistics from './views/Statistics.vue'
import RecordForm from './views/RecordForm.vue'
import ShareQR from './views/ShareQR.vue'
import { apiList } from './api/index.js'

const active = ref('calendar')
const formVisible = ref(false)
const editing = ref(null)
const formDate = ref('')
const showQR = ref(false)

const titleMap = {
  calendar: '考勤日历',
  ledger: '考勤台账',
  statistics: '月度统计'
}
const title = computed(() => titleMap[active.value] || '阿姨考勤')

function openAdd(date) {
  editing.value = null
  formDate.value = date || ''
  formVisible.value = true
}

function openEdit(record) {
  editing.value = record
  formDate.value = ''
  formVisible.value = true
}

function closeForm() {
  formVisible.value = false
  editing.value = null
}

function onSaved() {
  formVisible.value = false
  editing.value = null
  // 通知当前页刷新
  refreshKey.value++
}

// 简单的刷新信号，传给子组件
const refreshKey = ref(0)
provide('refreshKey', refreshKey)

// 同步状态
const syncMsg = ref('正在同步...')
onMounted(async () => {
  try {
    await apiList('')
    syncMsg.value = '☁️ 云同步已连接'
  } catch { syncMsg.value = '⚠ 同步失败，数据仅本地' }
})

// 统计页 → 日历页 的月份跳转
const jumpMonth = ref('')
provide('jumpMonth', jumpMonth)
const nav = {
  goCalendarMonth(m) {
    jumpMonth.value = m
    active.value = 'calendar'
  }
}
provide('nav', nav)
</script>

<style scoped>
.app-root {
  min-height: 100vh;
}
.app-header {
  position: sticky;
  top: 0;
  z-index: 10;
  height: calc(46px + var(--safe-top));
  padding-top: var(--safe-top);
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f79b80 0%, #ef6f4e 100%);
  color: #fff;
  font-size: 17px;
  font-weight: 600;
  letter-spacing: 1px;
}
.header-qr {
  position: absolute;
  right: 14px;
  font-size: 22px;
  padding: 4px;
}
.page {
  padding: 12px 12px calc(70px + var(--safe-bottom));
}
.fab {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(64px + var(--safe-bottom));
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: none;
  background: var(--brand);
  color: #fff;
  font-size: 30px;
  line-height: 1;
  box-shadow: 0 4px 14px rgba(244, 121, 91, 0.45);
  z-index: 20;
}
.fab:active {
  background: var(--brand-deep);
}
.sync-status {
  text-align: center;
  font-size: 11px;
  color: #4caf50;
  padding: 4px 0 0;
  position: fixed;
  bottom: calc(50px + var(--safe-bottom));
  width: 100%;
  z-index: 5;
  pointer-events: none;
}
</style>
