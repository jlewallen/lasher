<script setup lang="ts">
import type { Expense } from "@/model";

defineProps<{
  path: string;
  expenses: Expense[];
}>();
</script>

<script lang="ts">
import _ from "lodash";
import Currency from "./Currency.vue";

export default {
  components: {
    Currency,
  },
  computed: {
    total(): number {
      return _.sum(this.expenses.map((e: Expense) => e.total));
    },
  },
  methods: {
    formatCurrency(value: number): string {
      return Intl.NumberFormat("en-US").format(value);
    },
  },
};
</script>

<template>
  <div class="path-summary">
    {{ path }} <span class="path-total"><Currency :value="total" /></span>
  </div>
</template>

<style scoped>
.path-total {
  font-size: 16pt;
  display: inline-block;
  color: #efefaa;
  color: #009854;
  color: #69b076;
  color: #ea5550;
  color: #b1585c;
}
</style>
