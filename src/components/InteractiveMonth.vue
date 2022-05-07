<script setup lang="ts">
import InteractiveExpense from "./InteractiveExpense.vue";
import { Month } from "@/model";

defineProps<{
  month: Month;
}>();
</script>

<template>
  <div class="month">
    <div class="title">Month: {{ month.date }}</div>
    <div
      v-for="expense in month.expenses"
      class="expense"
      v-bind:key="expense.key"
    >
      <InteractiveExpense :expense="expense" />
    </div>
  </div>
</template>

<style scoped>
.title {
  font-size: 18pt;
  font-weight: bold;
}
</style>
