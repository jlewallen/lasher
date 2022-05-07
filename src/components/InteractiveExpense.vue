<script setup lang="ts">
import type { Expense } from "@/model";

defineProps<{
  expense: Expense;
  openExpanded: boolean;
}>();
</script>

<script lang="ts">
import TransactionLedger from "./TransactionLedger.vue";

export default {
  data(): { expanded: boolean } {
    return { expanded: this.openExpanded };
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
  components: {
    TransactionLedger,
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
  font-size: 16pt;
  display: inline-block;
  color: #efefaa;
  color: #009854;
  color: #69b076;
  color: #ea5550;
  color: #b1585c;
}
</style>
