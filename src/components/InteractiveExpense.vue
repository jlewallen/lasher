<script setup lang="ts">
import { Month, Expenses } from "@/model";
import TransactionLedger from "./TransactionLedger.vue";

defineProps<{
  expense: Expense;
}>();
</script>

<script lang="ts">
import { Expense } from "@/model";

export default {
  data(): { expanded: boolean } {
    return { expanded: false };
  },
  mounted(): void {
    console.log("mounted");
  },
  methods: {
    onClick() {
      this.expanded = !this.expanded;
      console.log(this.expense.key, "toggled");
    },
  },
};
</script>

<template>
  <div class="expense" @click="onClick">
    {{ expense.name }}
    <div class="expense-total">${{ expense.total.toFixed(2) }}</div>
    <div class="expense-expanded" v-if="expanded">
      <TransactionLedger :transactions="expense.transactions" />
    </div>
  </div>
</template>

<style scoped>
.expense {
  cursor: pointer;
}

.expense-total {
  color: #efefaa;
  font-size: 16pt;
  display: inline-block;
}
</style>
