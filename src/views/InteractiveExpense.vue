<script setup lang="ts">
import type { Expense } from "@/model";

defineProps<{
  expense: Expense;
  openExpanded: boolean;
}>();
</script>

<script lang="ts">
import TransactionLedger from "./TransactionLedger.vue";
import Currency from "./Currency.vue";

export default {
  components: {
    Currency,
    TransactionLedger,
  },
  data(): { expanded: boolean } {
    return { expanded: this.openExpanded };
  },
  methods: {
    onClick() {
      this.expanded = !this.expanded;
    },
  },
};
</script>

<template>
  <div class="expense" @click="onClick">
    {{ expense.name }}
    <div class="expense-total"><Currency :value="expense.total" /></div>
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
  font-size: 16pt;
  display: inline-block;
}
</style>
