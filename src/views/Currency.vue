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
}
</style>
