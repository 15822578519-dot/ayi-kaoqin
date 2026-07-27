<template>
  <van-popup v-model:show="show" position="center" round class="qr-popup">
    <div class="qr-card">
      <div class="qr-title">扫码进入「阿姨考勤」</div>
      <div class="qr-sub">长按二维码可保存 / 分享；或扫码后在手机浏览器打开并【添加到主屏幕】</div>
      <div class="qr-box">
        <img v-if="qrDataUrl" :src="qrDataUrl" alt="二维码" class="qr-img" />
        <van-loading v-else />
      </div>
      <div class="qr-url">{{ url }}</div>
      <van-button block round type="primary" @click="show = false">知道了</van-button>
    </div>
  </van-popup>
</template>

<script setup>
import { ref, watch } from 'vue'
import QRCode from 'qrcode'

const props = defineProps({ modelValue: { type: Boolean, default: false } })
const emit = defineEmits(['update:modelValue'])

const show = ref(props.modelValue)
const qrDataUrl = ref('')
const url = ref('')

watch(
  () => props.modelValue,
  (v) => {
    show.value = v
    if (v) {
      url.value = window.location.origin + '/'
      QRCode.toDataURL(url.value, { width: 320, margin: 1, color: { dark: '#3a3330', light: '#ffffff' } })
        .then((d) => (qrDataUrl.value = d))
        .catch(() => (qrDataUrl.value = ''))
    }
  }
)
watch(show, (v) => emit('update:modelValue', v))
</script>

<style scoped>
.qr-popup {
  background: transparent;
}
.qr-card {
  width: 300px;
  max-width: 86vw;
  background: #fff;
  border-radius: 18px;
  padding: 20px 18px 18px;
  text-align: center;
}
.qr-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--text);
}
.qr-sub {
  margin-top: 6px;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.5;
}
.qr-box {
  margin: 16px auto;
  width: 200px;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-radius: 12px;
}
.qr-img {
  width: 200px;
  height: 200px;
  display: block;
}
.qr-url {
  font-size: 12px;
  color: var(--muted);
  word-break: break-all;
  margin-bottom: 14px;
}
</style>
