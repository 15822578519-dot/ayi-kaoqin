<template>
  <div class="form-overlay">
    <van-nav-bar
      :title="isEdit ? '编辑考勤' : '新增考勤'"
      left-text="返回"
      right-text="保存"
      left-arrow
      @click-left="emit('close')"
      @click-right="save"
    />

    <div class="form-body">
      <van-cell-group inset>
        <van-field
          v-model="form.date"
          label="日期"
          placeholder="请选择日期"
          readonly
          is-link
          @click="openDate"
        />

        <van-cell title="出勤情况" center>
          <template #value>
            <van-radio-group v-model="form.status" direction="horizontal" @change="onStatusChange">
              <van-radio name="work">上班</van-radio>
              <van-radio name="absent">缺勤</van-radio>
            </van-radio-group>
          </template>
        </van-cell>

        <van-field
          v-model="form.salary"
          label="应付工资"
          type="number"
          placeholder="元 / 天"
        >
          <template #right-icon>元</template>
        </van-field>

        <van-field
          v-model="form.note"
          label="备注"
          type="textarea"
          rows="2"
          autosize
          placeholder="可选，如：做饭、保洁、带娃"
        />
      </van-cell-group>

      <!-- 本单应付确认 -->
      <div class="summary card">
        <div class="summary-row">
          <span>本单应付</span>
          <b class="money">{{ formatMoney(salaryNum) }}</b>
        </div>
        <div class="hint">{{ statusMeta(form.status).label }} · 默认 ¥{{ defaultSalary }}/天，可手动修改</div>
      </div>
    </div>

    <!-- 日期选择器 -->
    <van-popup v-model:show="showDate" position="bottom" round>
      <van-date-picker
        v-model="datePick"
        title="选择日期"
        :min-date="minDate"
        :max-date="maxDate"
        @confirm="onDateConfirm"
        @cancel="showDate = false"
      />
    </van-popup>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { showToast, showLoadingToast, closeToast } from 'vant'
import { apiCreate, apiUpdate } from '../api/index.js'
import {
  DEFAULT_SALARY_WORK,
  DEFAULT_SALARY_ABSENT,
  statusMeta,
  formatMoney
} from '../utils/calc.js'

const props = defineProps({
  record: { type: Object, default: null },
  initialDate: { type: String, default: '' }
})
const emit = defineEmits(['close', 'saved'])

const isEdit = computed(() => !!props.record)

const today = new Date()
const minDate = new Date(today.getFullYear() - 1, 0, 1)
const maxDate = new Date(today.getFullYear() + 1, 11, 31)

const form = reactive({ date: '', status: 'work', salary: '', note: '' })
const defaultSalary = computed(() =>
  form.status === 'absent' ? DEFAULT_SALARY_ABSENT : DEFAULT_SALARY_WORK
)
const salaryNum = computed(() => {
  const n = Number(form.salary)
  return isFinite(n) ? n : defaultSalary.value
})

const showDate = ref(false)
const datePick = ref([])

function pad(n) {
  return String(n).padStart(2, '0')
}

function openDate() {
  const d = form.date ? form.date.split('-') : [today.getFullYear(), today.getMonth() + 1, today.getDate()]
  datePick.value = [String(d[0]), pad(d[1]), pad(d[2])]
  showDate.value = true
}
function onDateConfirm() {
  form.date = datePick.value.join('-')
  showDate.value = false
}

// 切换状态时，把工资重置为该状态的默认值（用户未手动改过才重置）
function onStatusChange() {
  form.salary = String(defaultSalary.value)
}

onMounted(() => {
  if (props.record) {
    const r = props.record
    form.date = r.date
    form.status = r.status === 'absent' ? 'absent' : 'work'
    form.salary = String(r.salary)
    form.note = r.note || ''
  } else {
    const d = props.initialDate
      ? props.initialDate.split('-')
      : [today.getFullYear(), today.getMonth() + 1, today.getDate()]
    form.date = `${d[0]}-${pad(d[1])}-${pad(d[2])}`
    form.salary = String(defaultSalary.value)
  }
})

async function save() {
  if (!form.date) return showToast('请选择日期')
  const salary = Number(form.salary)
  if (!isFinite(salary) || salary < 0) return showToast('请填写有效工资')

  const payload = {
    date: form.date,
    status: form.status,
    salary,
    note: form.note
  }

  showLoadingToast({ message: '保存中...', forbidClick: true, duration: 0 })
  try {
    if (isEdit.value) {
      await apiUpdate(props.record.id, payload)
    } else {
      await apiCreate(payload)
    }
    closeToast()
    showToast('已保存')
    emit('saved')
  } catch (e) {
    closeToast()
  }
}
</script>

<style scoped>
.form-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: var(--bg);
  display: flex;
  flex-direction: column;
}
.form-body {
  flex: 1;
  overflow: auto;
  padding: 12px 0 calc(20px + env(safe-area-inset-bottom));
}
.summary {
  margin: 14px 12px 0;
}
.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  font-size: 15px;
}
.summary-row b {
  font-size: 20px;
}
.hint {
  margin-top: 4px;
  font-size: 12px;
  color: var(--muted);
}
</style>
