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
  color: #efefaa;
  color: #009854;
  color: #69b076;
}
.currency-value {
  font-size: 16pt;
  display: inline-block;
  color: #efefaa;
  color: #009854;
  color: #69b076;
  color: #ea5550;
  color: #b1585c;
}
</style>
