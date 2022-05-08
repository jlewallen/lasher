<script setup lang="ts">
defineProps<{
  value: number;
}>();
</script>

<script lang="ts">
export default {
  methods: {
    formatCurrency(value: number): string {
      return Intl.NumberFormat("en-US").format(value);
    },
  },
};
</script>

<template>
  <span class="currency-value">${{ formatCurrency(value) }}</span>
</template>

<style scoped>
.currency-value {
  color: #009854;
  color: #009854;
  color: #b1585c;
  color: #efefaa;
  color: #ea5550;
  color: #69b076;
  color: #3f4e93;
  color: #68a9cf;
  color: #6b76ae;
  color: #5383c3;
  color: #bccddb;
  color: #b269a1;
  color: #bea2ca;
  color: #b16268;
  color: #d2a4c8;
  color: #f19ca7;
  color: #9079b6;
  color: #7058a3;
  color: #aaa7d0;
}
</style>
