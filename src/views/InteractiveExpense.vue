<script setup lang="ts">
import type { Event } from "@/model";

defineProps<{
  expense: Event;
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
  <div class="expense" @click="onClick" v-if="expense">
    <div class="expense-name">{{ expense.name }}</div>
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

.expense-name {
  display: inline-block;
  padding-right: 0.5em;
}

.expense-total {
  display: inline-block;
}
</style>
