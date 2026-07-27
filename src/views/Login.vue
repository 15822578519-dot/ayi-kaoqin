<template>
  <div class="login">
    <div class="login-card card">
      <div class="logo">👩‍🔧</div>
      <h1 class="title">阿姨考勤</h1>
      <p class="sub">家庭内部使用 · 请输入访问口令</p>

      <van-field
        v-model="code"
        type="password"
        label="口令"
        placeholder="请输入家庭口令"
        :border="false"
        @keyup.enter="submit"
      />

      <van-button type="primary" block round :loading="loading" @click="submit">
        进入
      </van-button>

      <p class="tip">仅家人可进入，阿姨无需操作</p>

      <p class="qr-link" @click="showQR = true">扫码进入 · 生成二维码</p>
    </div>

    <ShareQR v-model="showQR" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { showToast } from 'vant'
import { apiLogin } from '../api/index.js'
import ShareQR from './ShareQR.vue'

const emit = defineEmits(['authed'])
const code = ref('')
const loading = ref(false)
const showQR = ref(false)

async function submit() {
  if (!code.value) return showToast('请输入口令')
  loading.value = true
  try {
    const { token } = await apiLogin(code.value)
    emit('authed', token)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: radial-gradient(120% 80% at 50% 0%, #ffe3d6 0%, #fbf6f0 55%);
}
.login-card {
  width: 100%;
  max-width: 360px;
  text-align: center;
  padding: 34px 22px 28px;
  border-radius: 22px;
  border: 1px solid #f3e2d8;
}
.logo {
  font-size: 52px;
  line-height: 1;
}
.title {
  margin: 12px 0 4px;
  font-size: 22px;
  color: var(--brand-deep);
}
.sub {
  margin: 0 0 22px;
  color: var(--muted);
  font-size: 13px;
}
.login-card :deep(.van-field) {
  background: #f7f8fa;
  border-radius: 8px;
  margin-bottom: 18px;
}
.tip {
  margin: 16px 0 0;
  color: var(--muted);
  font-size: 12px;
}
.qr-link {
  margin: 10px 0 0;
  color: var(--brand);
  font-size: 13px;
  font-weight: 600;
}
</style>
