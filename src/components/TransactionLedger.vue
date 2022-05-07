<script setup lang="ts">
import { Transactions } from "@/model";

defineProps<{
  transactions: Transactions;
}>();
</script>

<template>
  <div class="transactions">
    <div v-for="(tx, i) in transactions.transactions" v-bind:key="i">
      {{ tx }}
    </div>
  </div>
</template>

<style scoped>
.title {
  font-size: 18pt;
  font-weight: bold;
}
</style>
